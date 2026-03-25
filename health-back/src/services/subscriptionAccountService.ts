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

