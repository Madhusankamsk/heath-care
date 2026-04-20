import type { Request, Response } from "express";

import {
  createOpdQueueEntry,
  deleteOpdQueueEntry,
  listTodayOpdDoctorQueue,
  listTodayOpdQueue as fetchTodayOpdQueuePage,
  updateOpdQueueEntryStatus,
} from "../services/opdService";
import { completeOpdConsultation, pickOpdPatient, unpickOpdPatient } from "../services/opdEncounterService";
import { okPaginated, parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

export async function listOpdQueueHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await fetchTodayOpdQueuePage({ skip, take, q });
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

export async function listOpdDoctorQueueHandler(req: Request, res: Response) {
  const userId = req.authUser?.sub?.trim();
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const { items, total } = await listTodayOpdDoctorQueue({ doctorUserId: userId, skip, take });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function pickOpdQueueHandler(req: Request, res: Response) {
  const userId = req.authUser?.sub?.trim();
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const queueId = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!queueId) {
    return res.status(400).json({ message: "Queue id is required" });
  }

  try {
    const result = await pickOpdPatient({ queueId, doctorUserId: userId });
    return res.status(201).json(result);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "OPD_NOT_ELIGIBLE") {
      return res.status(403).json({ message: "You are not on the active OPD doctors list" });
    }
    if (err.code === "QUEUE_NOT_FOUND") {
      return res.status(404).json({ message: "OPD queue record not found" });
    }
    if (err.code === "QUEUE_NOT_WAITING" || err.code === "QUEUE_ALREADY_PICKED") {
      return res.status(409).json({ message: "Patient is no longer available to pick" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to pick patient" });
  }
}

export async function unpickOpdQueueHandler(req: Request, res: Response) {
  const userId = req.authUser?.sub?.trim();
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const queueId = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!queueId) {
    return res.status(400).json({ message: "Queue id is required" });
  }

  try {
    const row = await unpickOpdPatient({ queueId, doctorUserId: userId });
    return res.json(row);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "QUEUE_NOT_FOUND") {
      return res.status(404).json({ message: "OPD queue record not found" });
    }
    if (err.code === "QUEUE_NOT_IN_CONSULTATION") {
      return res.status(409).json({ message: "Patient is not in consultation" });
    }
    if (err.code === "NOT_YOUR_PATIENT") {
      return res.status(403).json({ message: "You did not pick this patient" });
    }
    if (err.code === "QUEUE_NO_BOOKING" || err.code === "VISIT_NOT_FOUND") {
      return res.status(400).json({ message: "No active visit for this queue entry" });
    }
    if (err.code === "VISIT_ALREADY_COMPLETED") {
      return res.status(409).json({ message: "Visit already completed; cannot unpick" });
    }
    if (err.code === "CANNOT_UNPICK_LINKED_RECORDS") {
      return res.status(409).json({
        message: "Cannot return this patient: billing or dispatch is linked to this visit",
      });
    }
    return res.status(500).json({ message: err.message ?? "Unable to unpick patient" });
  }
}

export async function completeOpdQueueHandler(req: Request, res: Response) {
  const userId = req.authUser?.sub?.trim();
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const queueId = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!queueId) {
    return res.status(400).json({ message: "Queue id is required" });
  }

  const body = req.body as Partial<{ remark: string | null }>;
  const remark = body.remark === undefined ? undefined : body.remark;

  try {
    const row = await completeOpdConsultation({
      queueId,
      doctorUserId: userId,
      remark,
    });
    return res.json(row);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "QUEUE_NOT_IN_CONSULTATION") {
      return res.status(400).json({ message: "Queue entry has no active consultation" });
    }
    if (err.code === "NOT_YOUR_PATIENT") {
      return res.status(403).json({ message: "This consultation was picked by another doctor" });
    }
    if (err.code === "ALREADY_COMPLETED") {
      return res.status(409).json({ message: "Consultation already completed" });
    }
    if (err.code === "VISIT_NOT_FOUND") {
      return res.status(500).json({ message: "Visit record missing" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to complete consultation" });
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
