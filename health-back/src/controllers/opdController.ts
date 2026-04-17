import type { Request, Response } from "express";

import {
  createOpdQueueEntry,
  deleteOpdQueueEntry,
  listTodayOpdQueue as fetchTodayOpdQueuePage,
  updateOpdQueueEntryStatus,
} from "../services/opdService";
import { okPaginated, parsePaginationQuery } from "../lib/pagination";

export async function listOpdQueueHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const { items, total } = await fetchTodayOpdQueuePage({ skip, take });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function createOpdQueueHandler(req: Request, res: Response) {
  const body = req.body as Partial<{ patientId: string; statusLookupId: string | null }>;
  const patientId = typeof body.patientId === "string" ? body.patientId.trim() : "";
  if (!patientId) {
    return res.status(400).json({ message: "patientId is required" });
  }

  try {
    const row = await createOpdQueueEntry({
      patientId,
      statusLookupId:
        typeof body.statusLookupId === "string" ? body.statusLookupId.trim() : null,
    });
    return res.status(201).json(row);
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "PATIENT_NOT_FOUND") {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({ message: "Invalid OPD status" });
    }
    return res.status(500).json({ message: "Unable to create OPD queue record" });
  }
}

export async function patchOpdQueueHandler(req: Request, res: Response) {
  const { id } = req.params;
  const queueId = id?.trim() ?? "";
  if (!queueId) {
    return res.status(400).json({ message: "Queue id is required" });
  }

  const body = req.body as Partial<{ statusLookupId: string }>;
  const statusLookupId =
    typeof body.statusLookupId === "string" ? body.statusLookupId.trim() : "";
  if (!statusLookupId) {
    return res.status(400).json({ message: "statusLookupId is required" });
  }

  try {
    const row = await updateOpdQueueEntryStatus(queueId, statusLookupId);
    return res.json(row);
  } catch (e) {
    const err = e as { code?: string };
    if (err.code === "QUEUE_NOT_FOUND") {
      return res.status(404).json({ message: "OPD queue record not found" });
    }
    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({ message: "Invalid OPD status" });
    }
    return res.status(500).json({ message: "Unable to update OPD queue record" });
  }
}

export async function deleteOpdQueueHandler(req: Request, res: Response) {
  const { id } = req.params;
  const queueId = id?.trim() ?? "";
  if (!queueId) {
    return res.status(400).json({ message: "Queue id is required" });
  }

  try {
    await deleteOpdQueueEntry(queueId);
    return res.status(204).send();
  } catch {
    return res.status(404).json({ message: "OPD queue record not found" });
  }
}
