import { InHouseStatus, Prisma } from "@prisma/client";

import prisma from "../prisma/client";
import { andBookingSearch } from "../lib/searchWhere";

import { bookingWithDispatchInclude, type BookingListScope } from "./bookingService";
import { assertUserIsActiveInHouseDoctor } from "./inHouseDoctorEligibilityService";
import { createInHouseInvoiceIfAbsent } from "./inHouseInvoiceService";
import { createPatientDispenseInTransaction } from "./inventoryService";

export const IN_HOUSE_BOOKING_TYPE_KEY = "IN_HOUSE_NURSING" as const;

export type InHouseCompletionMedicineInput = {
  batchId: string;
  quantity: number;
  bookingId: string;
  patientId: string;
};

function inHouseBookingTypeWhere(): Prisma.BookingWhereInput {
  return { bookingTypeLookup: { lookupKey: IN_HOUSE_BOOKING_TYPE_KEY } };
}

function scopeWhere(params: {
  scope: BookingListScope;
  userId: string | undefined;
}): Prisma.BookingWhereInput {
  if (params.scope !== "own" || !params.userId) return {};
  return { inHouseDetail: { is: { assignedDoctorId: params.userId } } };
}

function statusWhere(status: InHouseStatus): Prisma.BookingWhereInput {
  return { inHouseDetail: { is: { status } } };
}

export async function listInHousePendingAdmissions(params: {
  userId: string | undefined;
  scope: BookingListScope;
  skip: number;
  take: number;
  q?: string;
}) {
  const base: Prisma.BookingWhereInput = {
    AND: [inHouseBookingTypeWhere(), statusWhere(InHouseStatus.PENDING), scopeWhere(params)],
  };
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

/** Pending pool + ADMITTED rows already assigned to this doctor (OPD-like). */
export async function listInHouseDoctorQueue(params: {
  doctorUserId: string;
  skip: number;
  take: number;
  q?: string;
}) {
  const base: Prisma.BookingWhereInput = {
    AND: [
      inHouseBookingTypeWhere(),
      {
        OR: [
          { inHouseDetail: { is: { status: InHouseStatus.PENDING, assignedDoctorId: null } } },
          {
            inHouseDetail: {
              is: {
                status: { in: [InHouseStatus.PENDING, InHouseStatus.ADMITTED] },
                assignedDoctorId: params.doctorUserId,
              },
            },
          },
        ],
      },
    ],
  };
  const where = andBookingSearch(base, params.q) ?? base;
  const [total, items] = await prisma.$transaction([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { scheduledDate: { sort: "asc", nulls: "last" } },
      include: bookingWithDispatchInclude,
    }),
  ]);
  return { items, total };
}

export async function listInHouseInCare(params: {
  userId: string | undefined;
  scope: BookingListScope;
  skip: number;
  take: number;
  q?: string;
}) {
  const base: Prisma.BookingWhereInput = {
    AND: [inHouseBookingTypeWhere(), statusWhere(InHouseStatus.ADMITTED), scopeWhere(params)],
  };
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

export async function listInHouseDischarged(params: {
  userId: string | undefined;
  scope: BookingListScope;
  skip: number;
  take: number;
  q?: string;
}) {
  const base: Prisma.BookingWhereInput = {
    AND: [inHouseBookingTypeWhere(), statusWhere(InHouseStatus.DISCHARGED), scopeWhere(params)],
  };
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

export async function pickInHousePatient(params: { bookingId: string; doctorUserId: string }) {
  await assertUserIsActiveInHouseDoctor(params.doctorUserId);
  return prisma.$transaction(
    async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: params.bookingId },
        include: {
          bookingTypeLookup: { select: { lookupKey: true } },
          inHouseDetail: { select: { status: true, assignedDoctorId: true } },
        },
      });

      if (!booking || !booking.inHouseDetail) {
        const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
        err.code = "BOOKING_NOT_FOUND";
        throw err;
      }
      if (booking.bookingTypeLookup.lookupKey !== IN_HOUSE_BOOKING_TYPE_KEY) {
        const err = new Error("NOT_IN_HOUSE_BOOKING") as Error & { code?: string };
        err.code = "NOT_IN_HOUSE_BOOKING";
        throw err;
      }
      if (booking.inHouseDetail.status !== InHouseStatus.PENDING) {
        const err = new Error("BOOKING_NOT_PENDING") as Error & { code?: string };
        err.code = "BOOKING_NOT_PENDING";
        throw err;
      }
      if (booking.inHouseDetail.assignedDoctorId) {
        const err = new Error("BOOKING_ALREADY_PICKED") as Error & { code?: string };
        err.code = "BOOKING_ALREADY_PICKED";
        throw err;
      }

      await tx.inHouseDetail.update({
        where: { bookingId: booking.id },
        data: { assignedDoctorId: params.doctorUserId },
      });

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: bookingWithDispatchInclude,
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function admitInHousePatient(params: {
  bookingId: string;
  actorUserId: string;
  access?: { scope: BookingListScope; userId: string | undefined };
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        bookingTypeLookup: { select: { lookupKey: true } },
        inHouseDetail: true,
        visitRecord: { select: { id: true } },
      },
    });
    if (!booking || !booking.inHouseDetail) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }
    if (booking.bookingTypeLookup.lookupKey !== IN_HOUSE_BOOKING_TYPE_KEY) {
      const err = new Error("NOT_IN_HOUSE_BOOKING") as Error & { code?: string };
      err.code = "NOT_IN_HOUSE_BOOKING";
      throw err;
    }
    if (!booking.inHouseDetail.assignedDoctorId) {
      const err = new Error("DOCTOR_NOT_ASSIGNED") as Error & { code?: string };
      err.code = "DOCTOR_NOT_ASSIGNED";
      throw err;
    }
    const access = params.access;
    if (
      access?.scope === "own" &&
      access.userId &&
      booking.inHouseDetail.assignedDoctorId !== access.userId
    ) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }
    if (booking.inHouseDetail.status !== InHouseStatus.PENDING) {
      const err = new Error("ALREADY_ADMITTED") as Error & { code?: string };
      err.code = "ALREADY_ADMITTED";
      throw err;
    }

    const now = new Date();
    if (!booking.visitRecord) {
      await tx.visitRecord.create({
        data: {
          bookingId: booking.id,
          patientId: booking.patientId,
          remark: null,
        },
      });
    }
    await tx.inHouseDetail.update({
      where: { bookingId: booking.id },
      data: { status: InHouseStatus.ADMITTED, admittedAt: now },
    });

    return tx.booking.findUnique({ where: { id: booking.id }, include: bookingWithDispatchInclude });
  });
}

export async function completeInHouseStay(params: {
  bookingId: string;
  actorUserId: string;
  remark?: string | null;
  medicines?: InHouseCompletionMedicineInput[];
  access?: { scope: BookingListScope; userId: string | undefined };
}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: params.bookingId },
      include: {
        bookingTypeLookup: { select: { lookupKey: true } },
        inHouseDetail: true,
        visitRecord: true,
      },
    });
    if (!booking || !booking.inHouseDetail) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }
    if (booking.bookingTypeLookup.lookupKey !== IN_HOUSE_BOOKING_TYPE_KEY) {
      const err = new Error("NOT_IN_HOUSE_BOOKING") as Error & { code?: string };
      err.code = "NOT_IN_HOUSE_BOOKING";
      throw err;
    }
    const access = params.access;
    if (
      access?.scope === "own" &&
      access.userId &&
      booking.inHouseDetail.assignedDoctorId !== access.userId
    ) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }
    if (booking.inHouseDetail.status !== InHouseStatus.ADMITTED) {
      const err = new Error("NOT_ADMITTED") as Error & { code?: string };
      err.code = "NOT_ADMITTED";
      throw err;
    }

    const visit = booking.visitRecord;
    if (!visit) {
      const err = new Error("VISIT_NOT_FOUND") as Error & { code?: string };
      err.code = "VISIT_NOT_FOUND";
      throw err;
    }

    for (const medicine of params.medicines ?? []) {
      if (medicine.bookingId !== booking.id || medicine.patientId !== booking.patientId) {
        const err = new Error("INVALID_MEDICINE_CONTEXT") as Error & { code?: string };
        err.code = "INVALID_MEDICINE_CONTEXT";
        throw err;
      }
      await createPatientDispenseInTransaction(tx, {
        batchId: medicine.batchId,
        quantity: medicine.quantity,
        bookingId: medicine.bookingId,
        patientId: medicine.patientId,
        transferredById: params.actorUserId,
        existingVisitId: visit.id,
      });
    }

    await tx.visitRecord.update({
      where: { id: visit.id },
      data: {
        completedAt: new Date(),
        ...(params.remark !== undefined ? { remark: params.remark } : {}),
      },
    });

    await tx.inHouseDetail.update({
      where: { bookingId: booking.id },
      data: { status: InHouseStatus.DISCHARGED, dischargedAt: new Date() },
    });

    await createInHouseInvoiceIfAbsent(tx, {
      bookingId: booking.id,
      patientId: booking.patientId,
      createdByUserId: params.actorUserId,
    });

    return tx.booking.findUnique({ where: { id: booking.id }, include: bookingWithDispatchInclude });
  });
}
