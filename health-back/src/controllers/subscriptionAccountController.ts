import type { Request, Response } from "express";

import {
  createSubscriptionAccount,
  deleteSubscriptionAccount,
  getSubscriptionAccountById,
  listSubscriptionAccounts,
  updateSubscriptionAccount,
} from "../services/subscriptionAccountService";

export async function listSubscriptionAccountsHandler(_req: Request, res: Response) {
  const rows = await listSubscriptionAccounts();
  return res.json(rows);
}

export async function getSubscriptionAccountHandler(req: Request, res: Response) {
  const { id } = req.params;
  const row = await getSubscriptionAccountById(id);
  if (!row) return res.status(404).json({ message: "Subscription account not found" });
  return res.json(row);
}

export async function createSubscriptionAccountHandler(req: Request, res: Response) {
  const { accountName, planId, primaryContactId, startDate, endDate, statusId } = req.body as Partial<{
    accountName: string | null;
    planId: string;
    primaryContactId: string;
    startDate: string | null;
    endDate: string | null;
    statusId: string | null;
  }>;

  const cleanedPlanId = planId?.trim() ?? "";
  const cleanedPrimaryContactId = primaryContactId?.trim() ?? "";

  if (!cleanedPlanId || !cleanedPrimaryContactId) {
    return res.status(400).json({
      message: "planId and primaryContactId are required",
    });
  }

  const created = await createSubscriptionAccount({
    accountName: accountName?.trim() || undefined,
    planId: cleanedPlanId,
    primaryContactId: cleanedPrimaryContactId,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    statusId: statusId?.trim() || undefined,
  });

  return res.status(201).json(created);
}

export async function updateSubscriptionAccountHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { accountName, planId, primaryContactId, startDate, endDate, statusId } = req.body as Partial<{
    accountName: string | null;
    planId: string;
    primaryContactId: string;
    startDate: string | null;
    endDate: string | null;
    statusId: string | null;
  }>;

  const updated = await updateSubscriptionAccount(id, {
    accountName: typeof accountName === "string" ? accountName.trim() : undefined,
    planId: typeof planId === "string" ? planId.trim() : undefined,
    primaryContactId:
      typeof primaryContactId === "string" ? primaryContactId.trim() : undefined,
    startDate: startDate ?? undefined,
    endDate: endDate ?? undefined,
    statusId: typeof statusId === "string" ? statusId.trim() : undefined,
  });

  return res.json(updated);
}

export async function deleteSubscriptionAccountHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteSubscriptionAccount(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message: "Unable to delete subscription account. Remove linked records first.",
    });
  }
}

