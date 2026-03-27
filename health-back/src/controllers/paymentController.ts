import type { Request, Response } from "express";

import { listPayments } from "../services/paymentService";

export async function listPaymentsHandler(_req: Request, res: Response) {
  const rows = await listPayments();
  return res.json(rows);
}
