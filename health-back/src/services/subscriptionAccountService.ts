import prisma from "../prisma/client";

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

function toDateOrUndefined(value?: string | Date | null) {
  if (value === undefined || value === null || value === "") return undefined;
  return typeof value === "string" ? new Date(value) : value;
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

export async function listSubscriptionAccounts() {
  return prisma.subscriptionAccount.findMany({
    orderBy: [{ startDate: "desc" }, { accountName: "asc" }],
    include: includePayload,
  });
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

  return prisma.$transaction(async (tx) => {
    const account = await tx.subscriptionAccount.create({
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
        statusId: data.statusId ?? undefined,
      },
    });

    return tx.subscriptionAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: includePayload,
    });
  });
}

export async function updateSubscriptionAccount(
  id: string,
  data: Partial<SubscriptionAccountCreateInput>,
) {
  const startDate = toDateOrUndefined(data.startDate);
  const endDate = toDateOrUndefined(data.endDate);

  return prisma.$transaction(async (tx) => {
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
        statusId: data.statusId ?? undefined,
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

