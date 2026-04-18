import prisma from "../prisma/client";

import { subscriptionPlanTextSearchWhere } from "../lib/searchWhere";

export async function listSubscriptionPlans(params: { skip: number; take: number; q?: string }) {
  const where = params.q?.trim() ? subscriptionPlanTextSearchWhere(params.q) : {};
  const [total, items] = await prisma.$transaction([
    prisma.subscriptionPlan.count({ where }),
    prisma.subscriptionPlan.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { planName: "asc" },
      include: {
        planTypeLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      },
    }),
  ]);
  return { items, total };
}

export async function getSubscriptionPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      planTypeLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function createSubscriptionPlan(data: {
  planName: string;
  planTypeId: string;
  price: number | string;
  maxMembers?: number;
  durationDays: number;
  isActive?: boolean;
}) {
  return prisma.subscriptionPlan.create({
    data: {
      planName: data.planName,
      planTypeId: data.planTypeId,
      price: data.price,
      maxMembers: data.maxMembers ?? 1,
      durationDays: data.durationDays,
      isActive: data.isActive ?? true,
    },
    include: {
      planTypeLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function updateSubscriptionPlan(
  id: string,
  data: {
    planName?: string;
    planTypeId?: string;
    price?: number | string;
    maxMembers?: number;
    durationDays?: number;
    isActive?: boolean;
  },
) {
  return prisma.subscriptionPlan.update({
    where: { id },
    data,
    include: {
      planTypeLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function deleteSubscriptionPlan(id: string) {
  return prisma.subscriptionPlan.delete({ where: { id } });
}

export async function listSubscriptionPlanTypes() {
  return prisma.lookup.findMany({
    where: {
      isActive: true,
      category: { categoryName: "SUB_TYPE" },
    },
    orderBy: { lookupValue: "asc" },
    select: { id: true, lookupKey: true, lookupValue: true },
  });
}

