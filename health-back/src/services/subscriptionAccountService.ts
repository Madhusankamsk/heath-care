import prisma from "../prisma/client";

import { subscriptionAccountListSearchWhere } from "../lib/searchWhere";
import type { Prisma } from "@prisma/client";

import { notifySubscriptionAccountCreated } from "./email/notifications";
import { createSubscriptionInvoiceWithLedger } from "./subscriptionBillingService";

export type SubscriptionAccountCreateInput = {
  accountName?: string | null;
  registrationNo?: string | null;
  billingAddress?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNo?: string | null;
  planId: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  statusId?: string | null;
  /** When set, patient is added as a member (billing is always created; invoice has no patient for corporate). */
  primaryPatientId?: string | null;
  createdByUserId?: string | null;
};

export type AddSubscriptionMemberInput = {
  nicOrPassport: string;
  patient?: {
    fullName: string;
    shortName?: string | null;
    dob?: string | Date | null;
    contactNo?: string | null;
    whatsappNo?: string | null;
    genderId?: string | null;
    address?: string | null;
    hasInsurance?: boolean;
    hasGuardian?: boolean;
    guardianName?: string | null;
    guardianEmail?: string | null;
    guardianWhatsappNo?: string | null;
    guardianContactNo?: string | null;
    guardianRelationship?: string | null;
    billingRecipientId?: string | null;
  };
};

export class AddSubscriptionMemberError extends Error {
  constructor(
    public code: "ACCOUNT_NOT_FOUND" | "MAX_MEMBERS_REACHED" | "PATIENT_DETAILS_REQUIRED" | "ALREADY_MEMBER",
    message: string,
  ) {
    super(message);
    this.name = "AddSubscriptionMemberError";
  }
}

export class DetachSubscriptionMemberError extends Error {
  constructor(
    public code: "ACCOUNT_NOT_FOUND" | "MEMBER_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "DetachSubscriptionMemberError";
  }
}

function toDateOrUndefined(value?: string | Date | null) {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? new Date(value) : value;
}

async function resolveSubscriptionAccountStatusId(
  tx: Prisma.TransactionClient,
  statusId?: string | null,
): Promise<string | undefined> {
  if (!statusId) return undefined;
  const status = await tx.lookup.findFirst({
    where: {
      id: statusId,
      isActive: true,
      category: { categoryName: "SUBSCRIPTION_ACCOUNT_STATUS" },
    },
    select: { id: true },
  });
  if (!status) {
    throw new Error("Invalid subscription account status");
  }
  return status.id;
}

const includePayload = {
  plan: {
    select: {
      id: true,
      planName: true,
      planTypeId: true,
      durationDays: true,
      maxMembers: true,
      isActive: true,
      planTypeLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  },
  statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
  members: {
    select: {
      id: true,
      joinedAt: true,
      patient: {
        select: {
          id: true,
          fullName: true,
          nicOrPassport: true,
          contactNo: true,
        },
      },
    },
    orderBy: { joinedAt: "asc" as const },
  },
} as const;

export async function listSubscriptionAccounts(params: { skip: number; take: number; q?: string }) {
  const base = {
    plan: { maxMembers: { gt: 1 } },
  };
  const where = params.q?.trim()
    ? { AND: [base, subscriptionAccountListSearchWhere(params.q)] }
    : base;

  const [total, accounts] = await prisma.$transaction([
    prisma.subscriptionAccount.count({ where }),
    prisma.subscriptionAccount.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: [{ startDate: "desc" }, { accountName: "asc" }],
      include: includePayload,
    }),
  ]);

  return { items: accounts, total };
}

export async function getSubscriptionAccountById(id: string) {
  return prisma.subscriptionAccount.findUnique({
    where: { id },
    include: includePayload,
  });
}

export async function createSubscriptionAccount(data: SubscriptionAccountCreateInput) {
  const startDate = toDateOrUndefined(data.startDate);
  const endDate = toDateOrUndefined(data.endDate);

  const created = await prisma.$transaction(async (tx) => {
    const resolvedStatusId = await resolveSubscriptionAccountStatusId(tx, data.statusId);
    const primaryPid = data.primaryPatientId?.trim();
    if (primaryPid) {
      const patient = await tx.patient.findUnique({
        where: { id: primaryPid },
        select: { id: true },
      });
      if (!patient) {
        throw new Error("Primary patient not found");
      }
    }

    const account = await tx.subscriptionAccount.create({
      data: {
        accountName: data.accountName ?? undefined,
        registrationNo: data.registrationNo ?? undefined,
        billingAddress: data.billingAddress ?? undefined,
        contactEmail: data.contactEmail ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        whatsappNo: data.whatsappNo ?? undefined,
        primaryContactId: primaryPid || undefined,
        planId: data.planId,
        startDate,
        endDate,
        statusId: resolvedStatusId,
      },
    });

    if (primaryPid) {
      const existingMember = await tx.subscriptionMember.findFirst({
        where: { subscriptionAccountId: account.id, patientId: primaryPid },
      });
      if (!existingMember) {
        await tx.subscriptionMember.create({
          data: { subscriptionAccountId: account.id, patientId: primaryPid },
        });
      }
    }

    const billing = await createSubscriptionInvoiceWithLedger(tx, {
      subscriptionAccountId: account.id,
      patientId: null,
      planId: data.planId,
      payments: [],
      collectedByUserId: "",
      createdByUserId: data.createdByUserId,
    });
    const invoiceId = billing.invoiceId;

    const row = await tx.subscriptionAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: includePayload,
    });
    return { ...row, invoiceId };
  });

  void notifySubscriptionAccountCreated({
    subscriptionAccountId: created.id,
    invoiceId: created.invoiceId,
  });

  return created;
}

export async function updateSubscriptionAccount(
  id: string,
  data: Partial<SubscriptionAccountCreateInput>,
) {
  const startDate = toDateOrUndefined(data.startDate);
  const endDate = toDateOrUndefined(data.endDate);

  return prisma.$transaction(async (tx) => {
    const resolvedStatusId = await resolveSubscriptionAccountStatusId(tx, data.statusId);
    const updated = await tx.subscriptionAccount.update({
      where: { id },
      data: {
        accountName: data.accountName ?? undefined,
        registrationNo: data.registrationNo ?? undefined,
        billingAddress: data.billingAddress ?? undefined,
        contactEmail: data.contactEmail ?? undefined,
        contactPhone: data.contactPhone ?? undefined,
        whatsappNo: data.whatsappNo ?? undefined,
        planId: data.planId,
        startDate,
        endDate,
        statusId: resolvedStatusId,
      },
    });

    return tx.subscriptionAccount.findUniqueOrThrow({
      where: { id: updated.id },
      include: includePayload,
    });
  });
}

export async function deleteSubscriptionAccount(id: string) {
  return prisma.subscriptionAccount.delete({
    where: { id },
  });
}

export async function addSubscriptionMember(
  subscriptionAccountId: string,
  input: AddSubscriptionMemberInput,
) {
  const nicOrPassport = input.nicOrPassport.trim();
  if (!nicOrPassport) {
    throw new AddSubscriptionMemberError("PATIENT_DETAILS_REQUIRED", "nicOrPassport is required");
  }

  const dobValue =
    input.patient?.dob === null || input.patient?.dob === undefined || input.patient?.dob === ""
      ? undefined
      : typeof input.patient?.dob === "string"
        ? new Date(input.patient.dob)
        : input.patient?.dob;

  return prisma.$transaction(async (tx) => {
    const account = await tx.subscriptionAccount.findUnique({
      where: { id: subscriptionAccountId },
      include: {
        plan: { select: { id: true, maxMembers: true, planName: true } },
        _count: { select: { members: true } },
      },
    });

    if (!account) {
      throw new AddSubscriptionMemberError("ACCOUNT_NOT_FOUND", "Subscription account not found");
    }

    const maxMembers = account.plan?.maxMembers ?? 0;
    if (maxMembers > 0 && account._count.members >= maxMembers) {
      throw new AddSubscriptionMemberError(
        "MAX_MEMBERS_REACHED",
        `Maximum members reached for ${account.plan?.planName ?? "this plan"}`,
      );
    }

    let patient = await tx.patient.findUnique({
      where: { nicOrPassport },
      select: {
        id: true,
        nicOrPassport: true,
        fullName: true,
        contactNo: true,
      },
    });

    let createdPatient = false;
    if (!patient) {
      const fullName = input.patient?.fullName?.trim() ?? "";
      if (!fullName) {
        throw new AddSubscriptionMemberError(
          "PATIENT_DETAILS_REQUIRED",
          "fullName is required to create a new patient",
        );
      }

      patient = await tx.patient.create({
        data: {
          nicOrPassport,
          fullName,
          shortName: input.patient?.shortName ?? undefined,
          dob: dobValue ?? undefined,
          contactNo: input.patient?.contactNo ?? undefined,
          whatsappNo: input.patient?.whatsappNo ?? undefined,
          genderId: input.patient?.genderId ?? undefined,
          address: input.patient?.address ?? undefined,
          hasInsurance: Boolean(input.patient?.hasInsurance),
          hasGuardian: Boolean(input.patient?.hasGuardian),
          guardianName: input.patient?.guardianName ?? undefined,
          guardianEmail: input.patient?.guardianEmail ?? undefined,
          guardianWhatsappNo: input.patient?.guardianWhatsappNo ?? undefined,
          guardianContactNo: input.patient?.guardianContactNo ?? undefined,
          guardianRelationship: input.patient?.guardianRelationship ?? undefined,
          billingRecipientId: input.patient?.billingRecipientId ?? undefined,
        },
        select: {
          id: true,
          nicOrPassport: true,
          fullName: true,
          contactNo: true,
        },
      });
      createdPatient = true;
    }

    const existingMembership = await tx.subscriptionMember.findUnique({
      where: {
        subscriptionAccountId_patientId: {
          subscriptionAccountId,
          patientId: patient.id,
        },
      },
      select: { id: true },
    });

    if (existingMembership) {
      throw new AddSubscriptionMemberError(
        "ALREADY_MEMBER",
        "Patient is already a member of this subscription account",
      );
    }

    const member = await tx.subscriptionMember.create({
      data: {
        subscriptionAccountId,
        patientId: patient.id,
      },
      select: {
        id: true,
        joinedAt: true,
      },
    });

    return {
      member,
      patient,
      createdPatient,
    };
  });
}

export async function detachSubscriptionMember(subscriptionAccountId: string, patientId: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.subscriptionAccount.findUnique({
      where: { id: subscriptionAccountId },
      select: { id: true },
    });

    if (!account) {
      throw new DetachSubscriptionMemberError("ACCOUNT_NOT_FOUND", "Subscription account not found");
    }

    const membership = await tx.subscriptionMember.findUnique({
      where: {
        subscriptionAccountId_patientId: {
          subscriptionAccountId,
          patientId,
        },
      },
      select: { id: true },
    });

    if (!membership) {
      throw new DetachSubscriptionMemberError("MEMBER_NOT_FOUND", "Member not found in this subscription account");
    }

    await tx.subscriptionMember.delete({
      where: {
        subscriptionAccountId_patientId: {
          subscriptionAccountId,
          patientId,
        },
      },
    });
  });
}

