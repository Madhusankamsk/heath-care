import prisma from "../prisma/client";
import type { Prisma } from "@prisma/client";

import { andBookingSearch } from "../lib/searchWhere";

export type BookingListScope = "all" | "own";

type BookingPayload = {
  patientId: string;
  scheduledDate?: string | Date | null;
  bookingRemark?: string | null;
  requestedDoctorId?: string | null;
};

function parseScheduledDate(value: string | Date | null) {
  if (value === null || value === "") return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid scheduledDate");
  }
  return date;
}

export function resolveBookingListScope(
  permissionKeys: string[],
): BookingListScope {
  if (permissionKeys.includes("bookings:scope_all")) return "all";
  if (permissionKeys.includes("bookings:scope_own")) return "own";
  return "all";
}

async function getDoctorStatusLookupId(
  lookupKey: string,
): Promise<string | null> {
  const cat = await prisma.lookupCategory.findUnique({
    where: { categoryName: "DOCTOR_BOOKING_STATUS" },
  });
  if (!cat) return null;
  const row = await prisma.lookup.findFirst({
    where: { categoryId: cat.id, lookupKey },
  });
  return row?.id ?? null;
}

export type BookingTypeLookupKey = "VISIT" | "OPD" | "IN_HOUSE_NURSING";

async function getBookingTypeLookupId(lookupKey: BookingTypeLookupKey): Promise<string> {
  const row = await prisma.lookup.findFirst({
    where: {
      lookupKey,
      isActive: true,
      category: { categoryName: "BOOKING_TYPE" },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error(`Missing BOOKING_TYPE/${lookupKey}`);
  }
  return row.id;
}

const bookingInclude = {
  patient: { select: { id: true, fullName: true, nicOrPassport: true, contactNo: true } },
  requestedDoctor: { select: { id: true, fullName: true, email: true } },
  doctorStatusLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
  bookingTypeLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
  inHouseDetail: {
    select: {
      id: true,
      status: true,
      admittedAt: true,
      dischargedAt: true,
      admissionReason: true,
      roomNo: true,
      bedNo: true,
      vitalsSummary: true,
      assignedDoctor: { select: { id: true, fullName: true, email: true } },
    },
  },
} as const;

const dispatchAssignmentUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: { select: { id: true, roleName: true } },
} as const;

/** Bookings for a patient profile: full dispatch history per booking. */
export const bookingWithDispatchInclude = {
  patient: { select: { id: true, fullName: true, nicOrPassport: true, contactNo: true } },
  requestedDoctor: { select: { id: true, fullName: true, email: true } },
  doctorStatusLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
  bookingTypeLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
  inHouseDetail: {
    select: {
      id: true,
      status: true,
      admittedAt: true,
      dischargedAt: true,
      admissionReason: true,
      roomNo: true,
      bedNo: true,
      vitalsSummary: true,
      assignedDoctor: { select: { id: true, fullName: true, email: true } },
    },
  },
  visitRecord: {
    select: {
      id: true,
      completedAt: true,
      remark: true,
      diagnosticReports: {
        orderBy: { uploadedAt: "desc" as const },
        select: {
          id: true,
          reportName: true,
          fileUrl: true,
          uploadedAt: true,
          uploadedBy: { select: { id: true, fullName: true } },
        },
      },
      labSamples: {
        orderBy: { collectedAt: "desc" as const },
        select: {
          id: true,
          sampleType: true,
          collectedAt: true,
          labName: true,
          resultReportUrl: true,
          statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        },
      },
      medicines: {
        orderBy: { id: "desc" as const },
        select: {
          id: true,
          quantity: true,
          medicine: { select: { name: true } },
          batch: { select: { batchNo: true } },
        },
      },
    },
  },
  opdQueueEntry: { select: { id: true } },
  dispatchRecords: {
    orderBy: { dispatchedAt: "desc" as const },
    include: {
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      vehicle: { select: { id: true, vehicleNo: true, model: true } },
      assignments: {
        include: {
          user: { select: dispatchAssignmentUserSelect },
        },
      },
    },
  },
} as const;

export async function listBookingsForPatient(
  patientId: string,
  params: {
    userId: string | undefined;
    scope: BookingListScope;
    skip: number;
    take: number;
    q?: string;
  },
) {
  const scopeWhere: Prisma.BookingWhereInput =
    params.scope === "own" && params.userId
      ? { requestedDoctorId: params.userId }
      : {};

  const base: Prisma.BookingWhereInput = { patientId, ...scopeWhere };
  const where = andBookingSearch(base, params.q) ?? base;

  const [total, items] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { scheduledDate: { sort: "desc", nulls: "last" } },
      include: bookingWithDispatchInclude,
    }),
  ]);

  return { items, total };
}

export async function listBookings(params: {
  userId: string | undefined;
  scope: BookingListScope;
  skip: number;
  take: number;
  q?: string;
}) {
  const base: Prisma.BookingWhereInput | undefined =
    params.scope === "own" && params.userId
      ? { requestedDoctorId: params.userId }
      : undefined;

  const where = andBookingSearch(base, params.q) ?? base;

  const [total, items] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { scheduledDate: "desc" },
      include: bookingInclude,
    }),
  ]);

  return { items, total };
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
}

export async function createBooking(data: BookingPayload) {
  const scheduled =
    data.scheduledDate === undefined ? null : parseScheduledDate(data.scheduledDate ?? null);

  const requestedDoctorId =
    data.requestedDoctorId?.trim() ? data.requestedDoctorId.trim() : null;

  // No requested doctor → nothing to wait on; treat as accepted for scheduling / dispatch.
  const doctorStatusKey = requestedDoctorId ? "PENDING" : "ACCEPTED";
  const doctorStatusId = await getDoctorStatusLookupId(doctorStatusKey);
  const bookingTypeId = await getBookingTypeLookupId("VISIT");

  return prisma.booking.create({
    data: {
      patientId: data.patientId,
      scheduledDate: scheduled,
      bookingRemark: data.bookingRemark?.trim()
        ? data.bookingRemark.trim()
        : null,
      requestedDoctorId,
      doctorStatusId,
      bookingTypeId,
    },
    include: bookingInclude,
  });
}

/** Pending in-house admission (scheduled) before VisitRecord exists. */
export async function createInHouseBooking(data: BookingPayload) {
  const scheduled =
    data.scheduledDate === undefined ? null : parseScheduledDate(data.scheduledDate ?? null);
  const bookingTypeId = await getBookingTypeLookupId("IN_HOUSE_NURSING");

  const remark =
    data.bookingRemark?.trim() ? data.bookingRemark.trim() : "In-house nursing";

  return prisma.booking.create({
    data: {
      patientId: data.patientId,
      scheduledDate: scheduled,
      bookingRemark: remark,
      requestedDoctorId: null,
      doctorStatusId: null,
      bookingTypeId,
      inHouseDetail: {
        create: {
          status: "PENDING",
        },
      },
    },
    include: bookingInclude,
  });
}

export async function updateBooking(
  id: string,
  data: {
    patientId?: string;
    scheduledDate?: string | Date | null;
    bookingRemark?: string | null;
    requestedDoctorId?: string | null;
    doctorStatusId?: string | null;
  },
) {
  const clearingDoctor =
    data.requestedDoctorId !== undefined &&
    (data.requestedDoctorId === null ||
      (typeof data.requestedDoctorId === "string" && !data.requestedDoctorId.trim()));

  const newRequestedDoctorId =
    data.requestedDoctorId === undefined
      ? undefined
      : data.requestedDoctorId === null
        ? null
        : typeof data.requestedDoctorId === "string" && data.requestedDoctorId.trim()
          ? data.requestedDoctorId.trim()
          : null;

  let doctorStatusId:
    | string
    | null
    | undefined;

  if (clearingDoctor) {
    doctorStatusId = await getDoctorStatusLookupId("ACCEPTED");
  } else if (data.doctorStatusId !== undefined) {
    doctorStatusId =
      data.doctorStatusId === null ? null : data.doctorStatusId.trim();
  } else if (
    data.requestedDoctorId !== undefined &&
    typeof newRequestedDoctorId === "string" &&
    newRequestedDoctorId
  ) {
    const existing = await prisma.booking.findUnique({
      where: { id },
      select: { requestedDoctorId: true },
    });
    if (!existing) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }
    if (existing.requestedDoctorId !== newRequestedDoctorId) {
      doctorStatusId = await getDoctorStatusLookupId("PENDING");
    } else {
      doctorStatusId = undefined;
    }
  } else {
    doctorStatusId = undefined;
  }

  return prisma.booking.update({
    where: { id },
    data: {
      patientId: data.patientId,
      scheduledDate:
        data.scheduledDate === undefined
          ? undefined
          : data.scheduledDate === null
            ? null
            : parseScheduledDate(data.scheduledDate),
      bookingRemark:
        data.bookingRemark === undefined
          ? undefined
          : data.bookingRemark === null
            ? null
            : data.bookingRemark,
      requestedDoctorId:
        newRequestedDoctorId === undefined ? undefined : newRequestedDoctorId,
      doctorStatusId,
    },
    include: bookingInclude,
  });
}

export async function deleteBooking(id: string) {
  return prisma.booking.delete({ where: { id } });
}

// Deletes a booking and all linked records required by FK constraints.
// This prevents Prisma/Postgres from rejecting the delete due to restricted relations.
export async function deleteBookingCascade(id: string) {
  return prisma.$transaction(async (tx) => {
    // Dispatch pipeline
    const dispatchRecords = await tx.dispatchRecord.findMany({
      where: { bookingId: id },
      select: { id: true },
    });

    const dispatchIds = dispatchRecords.map((d) => d.id);
    if (dispatchIds.length) {
      // Not strictly required because DispatchAssignment -> DispatchRecord is `onDelete: Cascade`,
      // but deleting explicitly keeps DB behavior consistent across environments.
      await tx.dispatchAssignment.deleteMany({
        where: { dispatchId: { in: dispatchIds } },
      });
    }
    await tx.dispatchRecord.deleteMany({ where: { bookingId: id } });

    // Visit pipeline (and its direct children)
    const visit = await tx.visitRecord.findUnique({
      where: { bookingId: id },
      select: { id: true },
    });

    if (visit) {
      await tx.dispensedMedicine.deleteMany({ where: { visitId: visit.id } });
      await tx.diagnosticReport.deleteMany({ where: { visitId: visit.id } });
      await tx.labSample.deleteMany({ where: { visitId: visit.id } });
      await tx.visitRecord.deleteMany({ where: { bookingId: id } });
    }

    // Billing
    await tx.invoice.deleteMany({ where: { bookingId: id } });

    // Finally the booking row itself.
    return tx.booking.delete({ where: { id } });
  });
}
