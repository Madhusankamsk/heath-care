import prisma from "../prisma/client";
import type { Prisma } from "@prisma/client";

import { createSubscriptionInvoiceWithLedger } from "./subscriptionBillingService";

export type PatientCreateInput = {
  nicOrPassport?: string | null;
  fullName: string;
  shortName?: string | null;
  dob?: string | Date | null;
  contactNo?: string | null;
  whatsappNo?: string | null;
  gender?: string | null;
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
  subscriptionPlanId?: string | null;
  subscriptionStatusId?: string | null;
};

async function resolveSubscriptionStatusId(
  tx: Prisma.TransactionClient,
  subscriptionStatusId?: string | null,
) {
  if (!subscriptionStatusId) return undefined;
  const status = await tx.lookup.findFirst({
    where: {
      id: subscriptionStatusId,
      isActive: true,
      category: { categoryName: "SUBSCRIPTION_ACCOUNT_STATUS" },
    },
    select: { id: true },
  });
  if (!status) throw new Error("Invalid subscription status");
  return status.id;
}

export async function listPatients() {
  const now = new Date();

  const patients = await prisma.patient.findMany({
    orderBy: { fullName: "asc" },
    include: {
      genderLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      billingRecipientLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      subscriptionMemberships: {
        include: {
          subscriptionAccount: {
            include: {
              plan: true,
              statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
              members: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  return patients.map((p) => {
    const activeMembership = p.subscriptionMemberships.find((sm) => {
      const acc = sm.subscriptionAccount;
      if (!acc) return false;
      const endOk = !acc.endDate || acc.endDate.getTime() >= now.getTime();
      // A patient is considered "subscribed" if a membership exists whose plan is active and membership hasn't ended.
      // Subscription status is handled separately via `subscriptionStatusName`.
      return endOk && Boolean(acc.plan?.isActive);
    });

    const subscriptionPlanId = activeMembership?.subscriptionAccount?.plan?.id ?? null;
    const subscriptionPlanName =
      activeMembership?.subscriptionAccount?.plan?.planName ?? null;
    const subscriptionStatusId =
      activeMembership?.subscriptionAccount?.statusLookup?.id ?? null;
    const subscriptionStatusName =
      activeMembership?.subscriptionAccount?.statusLookup?.lookupValue ?? null;
    const subscriptionAccountMembersCount =
      activeMembership?.subscriptionAccount?.members?.length ?? 0;

    const { subscriptionMemberships: _ignored, ...rest } = p as any;
    return {
      ...rest,
      isSubscribed: Boolean(subscriptionPlanId),
      subscriptionPlanId,
      subscriptionPlanName,
      subscriptionStatusId,
      subscriptionStatusName,
      isSubscriptionAccountShared: subscriptionAccountMembersCount > 1,
    };
  });
}

export async function getPatientById(id: string) {
  const now = new Date();

  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      genderLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      billingRecipientLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      subscriptionMemberships: {
        include: {
          subscriptionAccount: {
            include: {
              plan: true,
              statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
              members: { select: { id: true } },
            },
          },
        },
      },
    },
  });

  if (!patient) return null;

  const activeMembership = patient.subscriptionMemberships.find((sm) => {
    const acc = sm.subscriptionAccount;
    if (!acc) return false;
    const endOk = !acc.endDate || acc.endDate.getTime() >= now.getTime();
    return endOk && Boolean(acc.plan?.isActive);
  });

  const subscriptionPlanId = activeMembership?.subscriptionAccount?.plan?.id ?? null;
  const subscriptionPlanName = activeMembership?.subscriptionAccount?.plan?.planName ?? null;
  const subscriptionStatusId =
    activeMembership?.subscriptionAccount?.statusLookup?.id ?? null;
  const subscriptionStatusName =
    activeMembership?.subscriptionAccount?.statusLookup?.lookupValue ?? null;
  const subscriptionAccountMembersCount =
    activeMembership?.subscriptionAccount?.members?.length ?? 0;

  const { subscriptionMemberships: _ignored, ...rest } = patient as any;
  return {
    ...rest,
    isSubscribed: Boolean(subscriptionPlanId),
    subscriptionPlanId,
    subscriptionPlanName,
    subscriptionStatusId,
    subscriptionStatusName,
    isSubscriptionAccountShared: subscriptionAccountMembersCount > 1,
  };
}

export async function createPatient(data: PatientCreateInput) {
  const dobValue =
    data.dob === null || data.dob === undefined || data.dob === ""
      ? undefined
      : typeof data.dob === "string"
        ? new Date(data.dob)
        : data.dob;

  return prisma.$transaction(async (tx) => {
    let invoiceId: string | null = null;
    const patient = await tx.patient.create({
      data: {
        fullName: data.fullName,
        nicOrPassport: data.nicOrPassport ?? undefined,
        shortName: data.shortName ?? undefined,
        dob: dobValue ?? undefined,
        contactNo: data.contactNo ?? undefined,
        whatsappNo: data.whatsappNo ?? undefined,
        gender: data.gender ?? undefined,
        genderId: data.genderId ?? undefined,
        address: data.address ?? undefined,
        hasInsurance: data.hasInsurance ?? false,
        hasGuardian: data.hasGuardian ?? false,
        guardianName: data.guardianName ?? undefined,
        guardianEmail: data.guardianEmail ?? undefined,
        guardianWhatsappNo: data.guardianWhatsappNo ?? undefined,
        guardianContactNo: data.guardianContactNo ?? undefined,
        guardianRelationship: data.guardianRelationship ?? undefined,
        billingRecipientId: data.billingRecipientId ?? undefined,
      },
    });

    if (data.subscriptionPlanId) {
      const plan = await tx.subscriptionPlan.findUnique({
        where: { id: data.subscriptionPlanId },
        select: { id: true, durationDays: true },
      });
      if (plan) {
        const resolvedStatusId = await resolveSubscriptionStatusId(
          tx,
          data.subscriptionStatusId,
        );
        const fallbackActiveStatus = !resolvedStatusId
          ? await tx.lookup.findFirst({
              where: {
                isActive: true,
                lookupKey: "ACTIVE",
                category: { categoryName: "SUBSCRIPTION_ACCOUNT_STATUS" },
              },
              select: { id: true },
            })
          : null;
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

        const account = await tx.subscriptionAccount.create({
          data: {
            accountName: `${data.fullName} Subscription`,
            primaryContactId: patient.id,
            planId: plan.id,
            startDate,
            endDate,
            statusId: resolvedStatusId ?? fallbackActiveStatus?.id ?? undefined,
          },
        });

        await tx.subscriptionMember.create({
          data: {
            subscriptionAccountId: account.id,
            patientId: patient.id,
          },
        });

        const billing = await createSubscriptionInvoiceWithLedger(tx, {
          subscriptionAccountId: account.id,
          patientId: patient.id,
          planId: plan.id,
          payments: [],
          collectedByUserId: "",
        });
        invoiceId = billing.invoiceId;
      }
    }

    const row = await tx.patient.findUniqueOrThrow({
      where: { id: patient.id },
      include: {
        genderLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        billingRecipientLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      },
    });

    const subscriptionMemberships = await tx.subscriptionMember.findMany({
      where: { patientId: patient.id },
      include: {
        subscriptionAccount: {
          include: {
            plan: true,
            statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
            members: { select: { id: true } },
          },
        },
      },
    });

    const now = new Date();
    const activeMembership = subscriptionMemberships.find((sm) => {
      const acc = sm.subscriptionAccount;
      if (!acc) return false;
      const endOk = !acc.endDate || acc.endDate.getTime() >= now.getTime();
      return endOk && Boolean(acc.plan?.isActive);
    });

    const subscriptionPlanId = activeMembership?.subscriptionAccount?.plan?.id ?? null;
    const subscriptionPlanName =
      activeMembership?.subscriptionAccount?.plan?.planName ?? null;
    const subscriptionStatusId =
      activeMembership?.subscriptionAccount?.statusLookup?.id ?? null;
    const subscriptionStatusName =
      activeMembership?.subscriptionAccount?.statusLookup?.lookupValue ?? null;
    const subscriptionAccountMembersCount =
      activeMembership?.subscriptionAccount?.members?.length ?? 0;

    const shaped = {
      ...row,
      isSubscribed: Boolean(subscriptionPlanId),
      subscriptionPlanId,
      subscriptionPlanName,
      subscriptionStatusId,
      subscriptionStatusName,
      isSubscriptionAccountShared: subscriptionAccountMembersCount > 1,
    };

    return { patient: shaped, invoiceId };
  });
}

export async function updatePatient(
  id: string,
  data: Omit<PatientCreateInput, "fullName"> & { fullName?: string },
) {
  const dobValue =
    data.dob === null || data.dob === undefined || data.dob === ""
      ? undefined
      : typeof data.dob === "string"
        ? new Date(data.dob)
        : data.dob;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.patient.update({
      where: { id },
      data: {
        fullName: data.fullName,
        nicOrPassport: data.nicOrPassport ?? undefined,
        shortName: data.shortName ?? undefined,
        dob: dobValue ?? undefined,
        contactNo: data.contactNo ?? undefined,
        whatsappNo: data.whatsappNo ?? undefined,
        gender: data.gender ?? undefined,
        genderId: data.genderId ?? undefined,
        address: data.address ?? undefined,
        hasInsurance: data.hasInsurance,
        hasGuardian: data.hasGuardian,
        guardianName: data.guardianName ?? undefined,
        guardianEmail: data.guardianEmail ?? undefined,
        guardianWhatsappNo: data.guardianWhatsappNo ?? undefined,
        guardianContactNo: data.guardianContactNo ?? undefined,
        guardianRelationship: data.guardianRelationship ?? undefined,
        billingRecipientId: data.billingRecipientId ?? undefined,
      },
      include: {
        genderLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        billingRecipientLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      },
    });

    if (data.subscriptionStatusId !== undefined) {
      const resolvedStatusId = await resolveSubscriptionStatusId(
        tx,
        data.subscriptionStatusId,
      );

      const now = new Date();
      const activeMembership = await tx.subscriptionMember.findFirst({
        where: {
          patientId: id,
          subscriptionAccount: {
            plan: { isActive: true },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        },
        orderBy: { joinedAt: "desc" },
        select: { subscriptionAccountId: true },
      });

      if (activeMembership?.subscriptionAccountId) {
        const membersCount = await tx.subscriptionMember.count({
          where: { subscriptionAccountId: activeMembership.subscriptionAccountId },
        });

        if (membersCount > 1) {
          throw new Error(
            "Cannot change subscription status for patients in a shared subscription account",
          );
        }

        await tx.subscriptionAccount.update({
          where: { id: activeMembership.subscriptionAccountId },
          data: { statusId: resolvedStatusId ?? null },
        });
      }
    }

    return updated;
  });
}

export async function deletePatient(id: string) {
  return prisma.patient.delete({
    where: { id },
  });
}

