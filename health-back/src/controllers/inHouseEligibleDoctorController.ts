import type { Request, Response } from "express";

import {
  listAllInHouseEligibleDoctorRows,
  removeInHouseEligibleDoctor,
  upsertInHouseEligibleDoctor,
} from "../services/inHouseDoctorEligibilityService";

export async function listInHouseEligibleDoctorsHandler(_req: Request, res: Response) {
  const rows = await listAllInHouseEligibleDoctorRows();
  return res.json(rows);
}

export async function putInHouseEligibleDoctorHandler(req: Request, res: Response) {
  const userId = typeof req.params.userId === "string" ? req.params.userId.trim() : "";
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }
  const body = req.body as Partial<{ isActive: boolean }>;
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  try {
    const row = await upsertInHouseEligibleDoctor(userId, isActive);
    return res.status(201).json(row);
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "USER_NOT_FOUND") {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(500).json({ message: "Unable to update in-house eligibility" });
  }
}

export async function deleteInHouseEligibleDoctorHandler(req: Request, res: Response) {
  const userId = typeof req.params.userId === "string" ? req.params.userId.trim() : "";
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    await removeInHouseEligibleDoctor(userId);
    return res.status(204).send();
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "NOT_FOUND") {
      return res.status(404).json({ message: "Eligibility row not found" });
    }
    return res.status(500).json({ message: "Unable to remove in-house eligibility" });
  }
}
