import prisma from "../prisma/client";

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
};

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
      return endOk && Boolean(acc.plan?.isActive);
    });

    const subscriptionPlanId = activeMembership?.subscriptionAccount?.plan?.id ?? null;
    const subscriptionPlanName =
      activeMembership?.subscriptionAccount?.plan?.planName ?? null;

    const { subscriptionMemberships: _ignored, ...rest } = p as any;
    return {
      ...rest,
      isSubscribed: Boolean(subscriptionPlanId),
      subscriptionPlanId,
      subscriptionPlanName,
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

  const { subscriptionMemberships: _ignored, ...rest } = patient as any;
  return {
    ...rest,
    isSubscribed: Boolean(subscriptionPlanId),
    subscriptionPlanId,
    subscriptionPlanName,
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
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

        const account = await tx.subscriptionAccount.create({
          data: {
            accountName: `${data.fullName} Subscription`,
            planId: plan.id,
            startDate,
            endDate,
            statusId: null,
          },
        });

        await tx.subscriptionMember.create({
          data: {
            subscriptionAccountId: account.id,
            patientId: patient.id,
          },
        });
      }
    }

    return tx.patient.findUniqueOrThrow({
      where: { id: patient.id },
      include: {
        genderLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        billingRecipientLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      },
    });
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

  return prisma.patient.update({
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
}

export async function deletePatient(id: string) {
  return prisma.patient.delete({
    where: { id },
  });
}

