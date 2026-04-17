import type { Request, Response } from "express";
import {
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getSubscriptionPlanById,
  listSubscriptionPlans as fetchSubscriptionPlansPage,
  listSubscriptionPlanTypes,
  updateSubscriptionPlan,
} from "../services/subscriptionPlanService";
import { okPaginated, parsePaginationQuery } from "../lib/pagination";

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const n = typeof value === "string" ? Number(value) : Number(value);
  if (Number.isNaN(n)) return undefined;
  return n;
}

export async function listSubscriptionPlansHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const { items, total } = await fetchSubscriptionPlansPage({ skip, take });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function getSubscriptionPlanHandler(req: Request, res: Response) {
  const { id } = req.params;
  const plan = await getSubscriptionPlanById(id);
  if (!plan) return res.status(404).json({ message: "Subscription plan not found" });
  return res.json(plan);
}

export async function createSubscriptionPlanHandler(req: Request, res: Response) {
  const { planName, planTypeId, price, maxMembers, durationDays, isActive } = req.body as Partial<{
    planName: string;
    planTypeId: string;
    price: number | string;
    maxMembers: number | string;
    durationDays: number | string;
    isActive: boolean;
  }>;

  const cleanedName = planName?.trim() ?? "";
  const cleanedPlanTypeId = planTypeId?.trim() ?? "";
  const parsedPrice = parseNumber(price);
  const parsedMaxMembers = parseNumber(maxMembers);
  const parsedDurationDays = parseNumber(durationDays);

  if (!cleanedName || !cleanedPlanTypeId || parsedPrice === undefined || parsedDurationDays === undefined) {
    return res.status(400).json({
      message: "planName, planTypeId, price and durationDays are required",
    });
  }

  const plan = await createSubscriptionPlan({
    planName: cleanedName,
    planTypeId: cleanedPlanTypeId,
    price: parsedPrice,
    maxMembers: parsedMaxMembers,
    durationDays: parsedDurationDays,
    isActive: typeof isActive === "boolean" ? isActive : true,
  });

  return res.status(201).json(plan);
}

export async function updateSubscriptionPlanHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { planName, planTypeId, price, maxMembers, durationDays, isActive } = req.body as Partial<{
    planName: string;
    planTypeId: string;
    price: number | string;
    maxMembers: number | string;
    durationDays: number | string;
    isActive: boolean;
  }>;

  const plan = await updateSubscriptionPlan(id, {
    planName: typeof planName === "string" ? planName.trim() : undefined,
    planTypeId: typeof planTypeId === "string" ? planTypeId.trim() : undefined,
    price: parseNumber(price),
    maxMembers: parseNumber(maxMembers),
    durationDays: parseNumber(durationDays),
    isActive: typeof isActive === "boolean" ? isActive : undefined,
  });

  return res.json(plan);
}

export async function deleteSubscriptionPlanHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteSubscriptionPlan(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message: "Unable to delete subscription plan. Remove linked accounts first.",
    });
  }
}

export async function listSubscriptionPlanTypesHandler(_req: Request, res: Response) {
  const planTypes = await listSubscriptionPlanTypes();
  return res.json(planTypes);
}

