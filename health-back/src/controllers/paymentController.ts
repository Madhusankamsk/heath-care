import type { Request, Response } from "express";

import {
  listCollectorDailySummaryPaginated,
  listPayments as fetchPaymentsPage,
  settleCollectorDaily,
} from "../services/paymentService";
import { parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

export async function listPaymentsHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await fetchPaymentsPage({ skip, take, q });
  return res.json({ items, total, page, pageSize });
}

export async function listCollectorDailySummaryHandler(req: Request, res: Response) {
  try {
    const date = typeof req.query.date === "string" ? req.query.date : undefined;
    const { page, pageSize, skip, take } = parsePaginationQuery(req);
    const q = parseOptionalQueryString(req);
    const { date: isoDate, items, total, grandTotalCollected, grandPendingSettlement } =
      await listCollectorDailySummaryPaginated(date, { skip, take, q });
    return res.json({
      date: isoDate,
      items,
      total,
      page,
      pageSize,
      grandTotalCollected,
      grandPendingSettlement,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load collector summary";
    if (message === "Invalid date") {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Unable to load collector summary" });
  }
}

export async function settleCollectorDailyHandler(req: Request, res: Response) {
  const { date, collectorId, paymentMethodKey } = req.body as Partial<{
    date: string;
    collectorId: string;
    paymentMethodKey: string;
  }>;

  try {
    const result = await settleCollectorDaily({
      date,
      collectorId: collectorId?.trim() ?? "",
      paymentMethodKey: paymentMethodKey?.trim() ?? "",
      settledByUserId: req.authUser?.sub,
    });
    return res.status(201).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to settle collector total";
    if (
      message === "Invalid date" ||
      message.includes("collectorId is required") ||
      message.includes("paymentMethodKey must be CASH or CHEQUE")
    ) {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Unable to settle collector total" });
  }
}
