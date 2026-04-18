import type { Request, Response } from "express";

import { parseOptionalQueryString } from "../lib/pagination";
import { loadPermissionKeys } from "../middleware/permissions";
import { dashboardGlobalSearch } from "../services/globalSearchService";
import { buildDashboardSummary } from "../services/dashboardSummaryService";

export async function getDashboardSummaryHandler(req: Request, res: Response) {
  const userId = req.authUser?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const permissionKeys = await loadPermissionKeys(req);
  const summary = await buildDashboardSummary({ userId, permissionKeys });
  return res.json(summary);
}

export async function getDashboardGlobalSearchHandler(req: Request, res: Response) {
  const userId = req.authUser?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const qRaw = parseOptionalQueryString(req);
  if (!qRaw) {
    return res.json({ patients: [], bookings: [] });
  }

  const permissionKeys = await loadPermissionKeys(req);
  const result = await dashboardGlobalSearch({ userId, permissionKeys, q: qRaw });
  return res.json(result);
}
