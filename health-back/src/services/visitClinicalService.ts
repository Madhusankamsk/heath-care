import prisma from "../prisma/client";
import type { BookingListScope } from "./bookingService";
import { ensureVisitRecordForBooking } from "./visitService";

export async function createDiagnosticReportForBooking(
  bookingId: string,
  data: { reportName: string; fileUrl: string },
  userId: string,
  access: { userId: string | undefined; scope: BookingListScope },
) {
  const visit = await ensureVisitRecordForBooking(bookingId, access);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { patientId: true },
  });
  if (!booking) {
    const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
    err.code = "BOOKING_NOT_FOUND";
    throw err;
  }

  const reportName = data.reportName.trim().slice(0, 500);
  const fileUrl = data.fileUrl.trim();
  if (!reportName || !fileUrl) {
    const err = new Error("INVALID_INPUT") as Error & { code?: string };
    err.code = "INVALID_INPUT";
    throw err;
  }

  return prisma.diagnosticReport.create({
    data: {
      patientId: booking.patientId,
      visitId: visit.id,
      reportName,
      fileUrl,
      uploadedById: userId,
    },
    include: {
      uploadedBy: { select: { id: true, fullName: true } },
    },
  });
}

export async function createLabSampleForBooking(
  bookingId: string,
  data: { sampleType: string; labName?: string | null },
  userId: string,
  access: { userId: string | undefined; scope: BookingListScope },
) {
  const visit = await ensureVisitRecordForBooking(bookingId, access);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { patientId: true },
  });
  if (!booking) {
    const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
    err.code = "BOOKING_NOT_FOUND";
    throw err;
  }

  const sampleType = data.sampleType.trim().slice(0, 200);
  if (!sampleType) {
    const err = new Error("INVALID_INPUT") as Error & { code?: string };
    err.code = "INVALID_INPUT";
    throw err;
  }

  const labName =
    data.labName === undefined || data.labName === null
      ? null
      : data.labName.trim()
        ? data.labName.trim().slice(0, 200)
        : null;

  return prisma.labSample.create({
    data: {
      patientId: booking.patientId,
      visitId: visit.id,
      sampleType,
      collectedById: userId,
      labName,
    },
    include: {
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}
