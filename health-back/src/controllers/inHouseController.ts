import type { Request, Response } from "express";

import { loadPermissionKeys } from "../middleware/permissions";
import {
  createInHouseBooking,
} from "../services/bookingService";
import {
  admitInHousePatient,
  completeInHouseStay,
  listInHouseDischarged,
  listInHouseDoctorQueue,
  listInHouseInCare,
  listInHousePendingAdmissions,
  pickInHousePatient,
} from "../services/inHouseEncounterService";
import { okPaginated, parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

async function getScope(req: Request) {
  const keys = await loadPermissionKeys(req);
  if (keys.includes("bookings:scope_all")) return "all" as const;
  if (keys.includes("bookings:scope_own")) return "own" as const;
  if (keys.includes("inhouse:pick") || keys.includes("inhouse:clinical")) return "own" as const;
  return "all" as const;
}

function mapServiceError(res: Response, e: unknown) {
  const err = e as Error & { code?: string };
  const code = err.code;
  if (code === "BOOKING_NOT_FOUND") return res.status(404).json({ message: "Booking not found" });
  if (code === "NOT_IN_HOUSE_BOOKING") return res.status(400).json({ message: "Not an in-house nursing booking" });
  if (code === "DOCTOR_NOT_ASSIGNED") return res.status(400).json({ message: "Assign a doctor before admission" });
  if (code === "BOOKING_NOT_PENDING") return res.status(409).json({ message: "Booking is no longer pending" });
  if (code === "BOOKING_ALREADY_PICKED") return res.status(409).json({ message: "Booking already picked by a doctor" });
  if (code === "IN_HOUSE_NOT_ELIGIBLE") return res.status(403).json({ message: "You are not on the active in-house doctors list" });
  if (code === "ALREADY_ADMITTED") return res.status(409).json({ message: "Patient already admitted" });
  if (code === "NOT_ADMITTED") return res.status(400).json({ message: "Patient not admitted yet" });
  if (code === "ALREADY_DISCHARGED") return res.status(409).json({ message: "Stay already discharged" });
  if (code === "INVALID_MEDICINE_CONTEXT") return res.status(400).json({ message: err.message });
  return res.status(500).json({ message: err.message ?? "Request failed" });
}

export async function postInHouseBookingHandler(req: Request, res: Response) {
  const {
    patientId,
    scheduledDate,
    bookingRemark,
  } = req.body as Partial<{
    patientId: string;
    scheduledDate: string | null;
    bookingRemark: string | null;
  }>;

  const cleanedPatientId = patientId?.trim() ?? "";
  if (!cleanedPatientId) {
    return res.status(400).json({ message: "patientId is required" });
  }

  try {
    const booking = await createInHouseBooking({
      patientId: cleanedPatientId,
      scheduledDate: scheduledDate?.trim() ? scheduledDate.trim() : null,
      bookingRemark: bookingRemark?.trim() ? bookingRemark.trim() : null,
    });
    return res.status(201).json(booking);
  } catch {
    return res.status(409).json({ message: "Unable to create in-house booking" });
  }
}

export async function listInHousePendingHandler(req: Request, res: Response) {
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listInHousePendingAdmissions({ userId, scope, skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function listInHouseInCareHandler(req: Request, res: Response) {
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listInHouseInCare({ userId, scope, skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function listInHouseDoctorQueueHandler(req: Request, res: Response) {
  const doctorUserId = req.authUser?.sub?.trim();
  if (!doctorUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listInHouseDoctorQueue({ doctorUserId, skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function postInHousePickHandler(req: Request, res: Response) {
  const doctorUserId = req.authUser?.sub?.trim();
  if (!doctorUserId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const bookingId = typeof req.params.id === "string" ? req.params.id.trim() : "";
  if (!bookingId) return res.status(400).json({ message: "Booking id is required" });

  try {
    const row = await pickInHousePatient({ bookingId, doctorUserId });
    return res.status(201).json(row);
  } catch (e) {
    return mapServiceError(res, e);
  }
}

export async function listInHouseDischargedHandler(req: Request, res: Response) {
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listInHouseDischarged({ userId, scope, skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function postInHouseAdmitHandler(req: Request, res: Response) {
  const { id } = req.params;
  const bookingId = id?.trim() ?? "";
  if (!bookingId) return res.status(400).json({ message: "Booking id is required" });
  const actorUserId = req.authUser?.sub?.trim();
  if (!actorUserId) return res.status(401).json({ message: "Unauthorized" });

  const scope = await getScope(req);
  const userId = req.authUser?.sub;

  try {
    const booking = await admitInHousePatient({
      bookingId,
      actorUserId,
      access: { scope, userId },
    });
    return res.status(200).json(booking);
  } catch (e) {
    return mapServiceError(res, e);
  }
}

export async function postInHouseCompleteHandler(req: Request, res: Response) {
  const { id } = req.params;
  const bookingId = id?.trim() ?? "";
  if (!bookingId) return res.status(400).json({ message: "Booking id is required" });

  const actorUserId = req.authUser?.sub?.trim();
  if (!actorUserId) return res.status(401).json({ message: "Unauthorized" });

  const body = req.body as Partial<{
    remark: string | null;
    medicines: Array<{
      batchId: string;
      quantity: number;
      bookingId: string;
      patientId: string;
    }>;
  }>;

  const scope = await getScope(req);
  const userId = req.authUser?.sub;

  try {
    const booking = await completeInHouseStay({
      bookingId,
      actorUserId,
      remark: body.remark,
      medicines: body.medicines,
      access: { scope, userId },
    });
    return res.status(200).json(booking);
  } catch (e) {
    return mapServiceError(res, e);
  }
}
