import type { Request, Response } from "express";

import { loadPermissionKeys } from "../middleware/permissions";
import { getPatientById } from "../services/patientService";
import {
  createBooking,
  deleteBooking,
  deleteBookingCascade,
  getBookingById,
  listBookings,
  listBookingsForPatient,
  resolveBookingListScope,
  updateBooking,
} from "../services/bookingService";
import {
  createDiagnosticReportForBooking,
  createLabSampleForBooking,
} from "../services/visitClinicalService";
import { saveVisitDraft } from "../services/visitService";

async function getScope(req: Request) {
  const keys = await loadPermissionKeys(req);
  return resolveBookingListScope(keys);
}

export async function listBookingsHandler(req: Request, res: Response) {
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const bookings = await listBookings({ userId, scope });
  return res.json(bookings);
}

/** Bookings + dispatch history for a patient (requires patients:read and bookings list/read). */
export async function listBookingsForPatientHandler(req: Request, res: Response) {
  const { id: patientId } = req.params;
  const cleaned = patientId?.trim() ?? "";
  if (!cleaned) {
    return res.status(400).json({ message: "Patient id is required" });
  }

  const keys = await loadPermissionKeys(req);
  if (!keys.includes("patients:read")) {
    return res.status(403).json({ message: "Forbidden" });
  }
  if (!keys.includes("bookings:list") && !keys.includes("bookings:read")) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const patient = await getPatientById(cleaned);
  if (!patient) {
    return res.status(404).json({ message: "Patient not found" });
  }

  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const bookings = await listBookingsForPatient(cleaned, { userId, scope });
  return res.json(bookings);
}

export async function getBookingHandler(req: Request, res: Response) {
  const { id } = req.params;
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const booking = await getBookingById(id);
  if (!booking) return res.status(404).json({ message: "Booking not found" });
  if (scope === "own" && userId && booking.requestedDoctorId !== userId) {
    return res.status(404).json({ message: "Booking not found" });
  }
  return res.json(booking);
}

export async function createBookingHandler(req: Request, res: Response) {
  const {
    patientId,
    scheduledDate,
    bookingRemark,
    requestedDoctorId,
  } = req.body as Partial<{
    patientId: string;
    scheduledDate: string | null;
    bookingRemark: string | null;
    requestedDoctorId: string | null;
  }>;

  const cleanedPatientId = patientId?.trim() ?? "";
  if (!cleanedPatientId) {
    return res.status(400).json({ message: "patientId is required" });
  }

  try {
    const booking = await createBooking({
      patientId: cleanedPatientId,
      scheduledDate: scheduledDate?.trim() ? scheduledDate.trim() : null,
      bookingRemark: bookingRemark?.trim() ? bookingRemark.trim() : null,
      requestedDoctorId: requestedDoctorId?.trim()
        ? requestedDoctorId.trim()
        : null,
    });
    return res.status(201).json(booking);
  } catch {
    return res.status(409).json({ message: "Unable to create booking" });
  }
}

export async function updateBookingHandler(req: Request, res: Response) {
  const { id } = req.params;
  const scope = await getScope(req);
  const userId = req.authUser?.sub;

  const existing = await getBookingById(id);
  if (!existing) return res.status(404).json({ message: "Booking not found" });

  if (scope === "own" && userId && existing.requestedDoctorId !== userId) {
    return res.status(404).json({ message: "Booking not found" });
  }

  const body = req.body as Record<string, unknown>;

  if (scope === "own") {
    const disallowed = [
      "requestedDoctorId",
      "patientId",
      "scheduledDate",
    ] as const;
    for (const key of disallowed) {
      if (body[key] !== undefined) {
        return res.status(403).json({ message: `Cannot update ${key} with your access scope` });
      }
    }
  }

  const {
    patientId,
    scheduledDate,
    bookingRemark,
    requestedDoctorId,
    doctorStatusId,
  } = req.body as Partial<{
    patientId: string;
    scheduledDate: string | null;
    bookingRemark: string | null;
    requestedDoctorId: string | null;
    doctorStatusId: string | null;
  }>;

  try {
    if (scope === "own") {
      const booking = await updateBooking(id, {
        bookingRemark:
          bookingRemark === undefined
            ? undefined
            : bookingRemark === null
              ? null
              : bookingRemark.trim(),
        doctorStatusId:
          doctorStatusId === undefined
            ? undefined
            : doctorStatusId === null
              ? null
              : doctorStatusId.trim(),
      });
      return res.json(booking);
    }

    const booking = await updateBooking(id, {
      patientId: typeof patientId === "string" ? patientId.trim() : undefined,
      scheduledDate:
        scheduledDate === undefined
          ? undefined
          : scheduledDate === null
            ? null
            : scheduledDate.trim(),
      bookingRemark:
        bookingRemark === undefined
          ? undefined
          : bookingRemark === null
            ? null
            : bookingRemark.trim(),
      requestedDoctorId:
        requestedDoctorId === undefined
          ? undefined
          : requestedDoctorId === null
            ? null
            : requestedDoctorId.trim(),
      doctorStatusId:
        doctorStatusId === undefined
          ? undefined
          : doctorStatusId === null
            ? null
            : doctorStatusId.trim(),
    });
    return res.json(booking);
  } catch {
    return res.status(409).json({ message: "Unable to update booking" });
  }
}

export async function patchVisitDraftHandler(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Partial<{ clinicalNotes: string | null; diagnosis: string | null }>;

  if (!id?.trim()) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  try {
    const scope = await getScope(req);
    const userId = req.authUser?.sub;
    const visit = await saveVisitDraft(
      id.trim(),
      {
        clinicalNotes: body.clinicalNotes,
        diagnosis: body.diagnosis,
      },
      { userId, scope },
    );
    return res.json(visit);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Booking not found" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to save visit draft" });
  }
}

export async function postDiagnosticReportHandler(req: Request, res: Response) {
  const { id: bookingId } = req.params;
  const userId = req.authUser?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!bookingId?.trim()) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const body = req.body as Partial<{ reportName: string; fileUrl: string }>;
  const reportName = typeof body.reportName === "string" ? body.reportName : "";
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl : "";

  try {
    const scope = await getScope(req);
    const report = await createDiagnosticReportForBooking(
      bookingId.trim(),
      { reportName, fileUrl },
      userId,
      { userId, scope },
    );
    return res.status(201).json(report);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (err.code === "INVALID_INPUT") {
      return res.status(400).json({ message: "reportName and fileUrl are required" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to create report" });
  }
}

export async function postLabSampleHandler(req: Request, res: Response) {
  const { id: bookingId } = req.params;
  const userId = req.authUser?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (!bookingId?.trim()) {
    return res.status(400).json({ message: "Invalid booking id" });
  }

  const body = req.body as Partial<{ sampleType: string; labName: string | null }>;
  const sampleType = typeof body.sampleType === "string" ? body.sampleType : "";
  const labName =
    body.labName === undefined
      ? undefined
      : body.labName === null
        ? null
        : typeof body.labName === "string"
          ? body.labName
          : undefined;

  try {
    const scope = await getScope(req);
    const sample = await createLabSampleForBooking(
      bookingId.trim(),
      { sampleType, labName },
      userId,
      { userId, scope },
    );
    return res.status(201).json(sample);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (err.code === "INVALID_INPUT") {
      return res.status(400).json({ message: "sampleType is required" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to record sample" });
  }
}

export async function deleteBookingHandler(req: Request, res: Response) {
  const { id } = req.params;
  const scope = await getScope(req);
  const userId = req.authUser?.sub;

  const existing = await getBookingById(id);
  if (!existing) return res.status(404).json({ message: "Booking not found" });
  if (scope === "own" && userId && existing.requestedDoctorId !== userId) {
    return res.status(404).json({ message: "Booking not found" });
  }

  try {
    await deleteBookingCascade(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({ message: "Unable to delete booking. Remove linked records first." });
  }
}
