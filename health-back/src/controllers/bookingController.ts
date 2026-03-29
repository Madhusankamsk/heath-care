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
