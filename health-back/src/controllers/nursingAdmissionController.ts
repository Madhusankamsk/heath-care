import type { Request, Response } from "express";

import {
  admitPatient,
  appendDailyNote,
  dischargeAdmission,
  listActiveAdmissions,
  listDischargedAdmissions,
  startNursingEncounter,
  updateCarePathway,
} from "../services/nursingAdmissionService";

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value == null) return undefined;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export async function listActiveNursingAdmissionsHandler(_req: Request, res: Response) {
  const items = await listActiveAdmissions();
  return res.json({ items });
}

export async function listDischargedNursingAdmissionsHandler(_req: Request, res: Response) {
  const items = await listDischargedAdmissions();
  return res.json({ items });
}

export async function admitNursingPatientHandler(req: Request, res: Response) {
  const { patientId, siteLabel, carePathwayKey, admittedAt } = req.body as Partial<{
    patientId: string;
    siteLabel: string | null;
    carePathwayKey: "OBSERVATION" | "TREATMENT";
    admittedAt: string;
  }>;

  const pid = patientId?.trim() ?? "";
  if (!pid) {
    return res.status(400).json({ message: "patientId is required" });
  }
  const pathway = carePathwayKey === "TREATMENT" ? "TREATMENT" : "OBSERVATION";
  const admittedAtDate = parseOptionalDate(admittedAt);
  if (admittedAtDate === null) {
    return res.status(400).json({ message: "admittedAt must be a valid datetime" });
  }

  try {
    const row = await admitPatient({
      patientId: pid,
      siteLabel: siteLabel ?? null,
      carePathwayKey: pathway,
      admittedAt: admittedAtDate,
    });
    return res.status(201).json(row);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "PATIENT_NOT_FOUND") {
      return res.status(404).json({ message: "Patient not found" });
    }
    if (err.code === "ALREADY_ADMITTED") {
      return res.status(409).json({ message: "Patient already has an active admission" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to admit patient" });
  }
}

export async function appendNursingDailyNoteHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { note } = req.body as Partial<{ note: string }>;
  const userId = req.authUser?.sub?.trim();

  if (!id?.trim()) {
    return res.status(400).json({ message: "Admission id is required" });
  }
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const row = await appendDailyNote({
      nursingAdmissionId: id.trim(),
      recordedByUserId: userId,
      note: note ?? "",
    });
    return res.status(201).json(row);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "NOTE_REQUIRED") {
      return res.status(400).json({ message: "note is required" });
    }
    if (err.code === "ADMISSION_NOT_FOUND") {
      return res.status(404).json({ message: "Admission not found" });
    }
    if (err.code === "ADMISSION_CLOSED") {
      return res.status(409).json({ message: "Admission is not active" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to save note" });
  }
}

export async function patchNursingCarePathwayHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { carePathwayKey } = req.body as Partial<{ carePathwayKey: "OBSERVATION" | "TREATMENT" }>;

  if (!id?.trim()) {
    return res.status(400).json({ message: "Admission id is required" });
  }

  const pathway = carePathwayKey === "TREATMENT" ? "TREATMENT" : "OBSERVATION";

  try {
    const row = await updateCarePathway({
      nursingAdmissionId: id.trim(),
      carePathwayKey: pathway,
    });
    return res.json(row);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ADMISSION_NOT_FOUND") {
      return res.status(404).json({ message: "Admission not found" });
    }
    if (err.code === "ADMISSION_CLOSED") {
      return res.status(409).json({ message: "Admission is not active" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to update pathway" });
  }
}

export async function dischargeNursingAdmissionHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { dischargedAt } = req.body as Partial<{ dischargedAt: string }>;
  if (!id?.trim()) {
    return res.status(400).json({ message: "Admission id is required" });
  }
  const dischargedAtDate = parseOptionalDate(dischargedAt);
  if (dischargedAtDate === null) {
    return res.status(400).json({ message: "dischargedAt must be a valid datetime" });
  }

  try {
    const row = await dischargeAdmission(id.trim(), dischargedAtDate);
    return res.json(row);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ADMISSION_NOT_FOUND") {
      return res.status(404).json({ message: "Admission not found" });
    }
    if (err.code === "ADMISSION_CLOSED") {
      return res.status(409).json({ message: "Admission is already closed" });
    }
    if (err.code === "INVALID_DISCHARGE_TIME") {
      return res.status(400).json({ message: "Discharge time cannot be before admission time" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to discharge" });
  }
}

export async function startNursingEncounterHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { requestedDoctorId, bookingRemark } = req.body as Partial<{
    requestedDoctorId: string | null;
    bookingRemark: string | null;
  }>;

  if (!id?.trim()) {
    return res.status(400).json({ message: "Admission id is required" });
  }

  try {
    const booking = await startNursingEncounter({
      nursingAdmissionId: id.trim(),
      requestedDoctorId: requestedDoctorId ?? undefined,
      bookingRemark: bookingRemark ?? undefined,
    });
    return res.status(201).json(booking);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "ADMISSION_NOT_FOUND") {
      return res.status(404).json({ message: "Admission not found" });
    }
    if (err.code === "ADMISSION_CLOSED") {
      return res.status(409).json({ message: "Admission is not active" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to start encounter" });
  }
}
