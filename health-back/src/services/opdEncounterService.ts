import { Prisma } from "@prisma/client";

import prisma from "../prisma/client";
import { createOpdInvoiceIfAbsent } from "./opdInvoiceService";
import { assertUserIsActiveOpdDoctor } from "./opdDoctorEligibilityService";
import { opdQueueInclude } from "./opdService";

const OPD_STATUS_CATEGORY = "OPD_STATUS";
const DOCTOR_BOOKING_STATUS = "DOCTOR_BOOKING_STATUS";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

async function getOpdStatusId(tx: Prisma.TransactionClient, lookupKey: string): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey,
      isActive: true,
      category: { categoryName: OPD_STATUS_CATEGORY },
    },
    select: { id: true },
  });
  if (!row) throw new Error(`Missing OPD_STATUS/${lookupKey}`);
  return row.id;
}

async function getDoctorStatusAcceptedId(tx: Prisma.TransactionClient): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey: "ACCEPTED",
      isActive: true,
      category: { categoryName: DOCTOR_BOOKING_STATUS },
    },
    select: { id: true },
  });
  if (!row) throw new Error("Missing DOCTOR_BOOKING_STATUS/ACCEPTED");
  return row.id;
}

/**
 * Doctor picks next patient from queue: creates OPD booking + visit, links queue row.
 * Uses serializable transaction to avoid double pick.
 */
export async function pickOpdPatient(params: { queueId: string; doctorUserId: string }) {
  await assertUserIsActiveOpdDoctor(params.doctorUserId);

  return prisma.$transaction(
    async (tx) => {
      const queue = await tx.opdQueue.findFirst({
        where: {
          id: params.queueId,
          visitDate: { gte: startOfToday(), lt: startOfTomorrow() },
        },
        include: { statusLookup: { select: { lookupKey: true } } },
      });

      if (!queue) {
        const err = new Error("QUEUE_NOT_FOUND") as Error & { code?: string };
        err.code = "QUEUE_NOT_FOUND";
        throw err;
      }

      if (queue.statusLookup?.lookupKey !== "WAITING") {
        const err = new Error("QUEUE_NOT_WAITING") as Error & { code?: string };
        err.code = "QUEUE_NOT_WAITING";
        throw err;
      }

      if (queue.bookingId) {
        const err = new Error("QUEUE_ALREADY_PICKED") as Error & { code?: string };
        err.code = "QUEUE_ALREADY_PICKED";
        throw err;
      }

      const inConsultationId = await getOpdStatusId(tx, "IN_CONSULTATION");
      const acceptedDoctorId = await getDoctorStatusAcceptedId(tx);
      const now = new Date();

      const booking = await tx.booking.create({
        data: {
          patientId: queue.patientId,
          scheduledDate: now,
          isOpd: true,
          requestedDoctorId: params.doctorUserId,
          doctorStatusId: acceptedDoctorId,
          bookingRemark: "OPD walk-in",
          status: "OPD",
        },
      });

      await tx.visitRecord.create({
        data: {
          bookingId: booking.id,
          patientId: queue.patientId,
          remark: null,
        },
      });

      const statusRow = await tx.lookup.findUnique({
        where: { id: inConsultationId },
        select: { lookupValue: true },
      });

      const updated = await tx.opdQueue.update({
        where: { id: queue.id },
        data: {
          bookingId: booking.id,
          pickedByUserId: params.doctorUserId,
          pickedAt: now,
          statusId: inConsultationId,
          status: statusRow?.lookupValue ?? "In Consultation",
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              shortName: true,
              nicOrPassport: true,
              contactNo: true,
            },
          },
          statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
          pickedBy: { select: { id: true, fullName: true, email: true } },
          booking: { select: { id: true, isOpd: true, patientId: true } },
        },
      });

      return { queue: updated, bookingId: booking.id };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    },
  );
}

export async function completeOpdConsultation(params: {
  queueId: string;
  doctorUserId: string;
  remark?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const queue = await tx.opdQueue.findUnique({
      where: { id: params.queueId },
      include: {
        statusLookup: { select: { lookupKey: true } },
        booking: {
          include: {
            visitRecord: true,
          },
        },
      },
    });

    if (!queue?.bookingId || !queue.booking) {
      const err = new Error("QUEUE_NOT_IN_CONSULTATION") as Error & { code?: string };
      err.code = "QUEUE_NOT_IN_CONSULTATION";
      throw err;
    }

    if (queue.pickedByUserId !== params.doctorUserId) {
      const err = new Error("NOT_YOUR_PATIENT") as Error & { code?: string };
      err.code = "NOT_YOUR_PATIENT";
      throw err;
    }

    if (queue.statusLookup?.lookupKey === "COMPLETED") {
      const err = new Error("ALREADY_COMPLETED") as Error & { code?: string };
      err.code = "ALREADY_COMPLETED";
      throw err;
    }

    const visit = queue.booking.visitRecord;
    if (!visit) {
      const err = new Error("VISIT_NOT_FOUND") as Error & { code?: string };
      err.code = "VISIT_NOT_FOUND";
      throw err;
    }

    const completedId = await getOpdStatusId(tx, "COMPLETED");
    const completedLabel = await tx.lookup.findUnique({
      where: { id: completedId },
      select: { lookupValue: true },
    });

    await tx.visitRecord.update({
      where: { id: visit.id },
      data: {
        completedAt: new Date(),
        ...(params.remark !== undefined ? { remark: params.remark } : {}),
      },
    });

    await createOpdInvoiceIfAbsent(tx, {
      opdQueueId: queue.id,
      bookingId: queue.bookingId,
      patientId: queue.booking.patientId,
    });

    const updatedQueue = await tx.opdQueue.update({
      where: { id: queue.id },
      data: {
        statusId: completedId,
        status: completedLabel?.lookupValue ?? "Completed",
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            shortName: true,
            nicOrPassport: true,
            contactNo: true,
          },
        },
        statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        pickedBy: { select: { id: true, fullName: true, email: true } },
        booking: { select: { id: true, isOpd: true, patientId: true } },
      },
    });

    return updatedQueue;
  });
}

/**
 * Return a picked patient to the waiting pool: only the doctor who picked may unpick,
 * and only while the visit is not completed and no billing exists for the booking.
 */
export async function unpickOpdPatient(params: { queueId: string; doctorUserId: string }) {
  return prisma.$transaction(async (tx) => {
    const queue = await tx.opdQueue.findFirst({
      where: {
        id: params.queueId,
        visitDate: { gte: startOfToday(), lt: startOfTomorrow() },
      },
      include: {
        statusLookup: { select: { lookupKey: true } },
        booking: {
          include: {
            visitRecord: true,
            invoices: { select: { id: true } },
            visitInvoices: { select: { invoiceId: true } },
            opdInvoiceRow: { select: { invoiceId: true } },
            dispatchRecords: { select: { id: true } },
          },
        },
      },
    });

    if (!queue) {
      const err = new Error("QUEUE_NOT_FOUND") as Error & { code?: string };
      err.code = "QUEUE_NOT_FOUND";
      throw err;
    }

    if (queue.statusLookup?.lookupKey !== "IN_CONSULTATION") {
      const err = new Error("QUEUE_NOT_IN_CONSULTATION") as Error & { code?: string };
      err.code = "QUEUE_NOT_IN_CONSULTATION";
      throw err;
    }

    if (queue.pickedByUserId !== params.doctorUserId) {
      const err = new Error("NOT_YOUR_PATIENT") as Error & { code?: string };
      err.code = "NOT_YOUR_PATIENT";
      throw err;
    }

    if (!queue.bookingId || !queue.booking) {
      const err = new Error("QUEUE_NO_BOOKING") as Error & { code?: string };
      err.code = "QUEUE_NO_BOOKING";
      throw err;
    }

    const booking = queue.booking;
    const visit = booking.visitRecord;

    if (!visit) {
      const err = new Error("VISIT_NOT_FOUND") as Error & { code?: string };
      err.code = "VISIT_NOT_FOUND";
      throw err;
    }

    if (visit.completedAt) {
      const err = new Error("VISIT_ALREADY_COMPLETED") as Error & { code?: string };
      err.code = "VISIT_ALREADY_COMPLETED";
      throw err;
    }

    if (
      booking.invoices.length > 0 ||
      booking.visitInvoices.length > 0 ||
      booking.opdInvoiceRow != null ||
      booking.dispatchRecords.length > 0
    ) {
      const err = new Error("CANNOT_UNPICK_LINKED_RECORDS") as Error & { code?: string };
      err.code = "CANNOT_UNPICK_LINKED_RECORDS";
      throw err;
    }

    const waitingId = await getOpdStatusId(tx, "WAITING");
    const waitingLabel = await tx.lookup.findUnique({
      where: { id: waitingId },
      select: { lookupValue: true },
    });

    await tx.dispensedMedicine.deleteMany({ where: { visitId: visit.id } });
    await tx.diagnosticReport.deleteMany({ where: { visitId: visit.id } });
    await tx.labSample.deleteMany({ where: { visitId: visit.id } });
    await tx.visitRecord.delete({ where: { id: visit.id } });

    await tx.opdQueue.update({
      where: { id: queue.id },
      data: {
        bookingId: null,
        pickedByUserId: null,
        pickedAt: null,
        statusId: waitingId,
        status: waitingLabel?.lookupValue ?? "Waiting",
      },
    });

    await tx.booking.delete({ where: { id: booking.id } });

    return tx.opdQueue.findUniqueOrThrow({
      where: { id: queue.id },
      include: opdQueueInclude,
    });
  });
}
