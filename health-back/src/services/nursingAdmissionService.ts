import { Prisma } from "@prisma/client";

import prisma from "../prisma/client";
import { bookingWithDispatchInclude } from "./bookingService";

const STATUS_CAT = "NURSING_ADMISSION_STATUS";
const PATHWAY_CAT = "NURSING_CARE_PATHWAY";
const BOOKING_TYPE_CAT = "BOOKING_TYPE";

async function lookupId(tx: Prisma.TransactionClient | typeof prisma, categoryName: string, lookupKey: string) {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey,
      isActive: true,
      category: { categoryName },
    },
    select: { id: true },
  });
  if (!row) throw new Error(`Missing ${categoryName}/${lookupKey}`);
  return row.id;
}

async function getBookingTypeNursingEncounterId(tx: Prisma.TransactionClient | typeof prisma) {
  return lookupId(tx, BOOKING_TYPE_CAT, "NURSING_ENCOUNTER");
}

async function getDoctorStatusId(tx: Prisma.TransactionClient | typeof prisma, key: "PENDING" | "ACCEPTED") {
  return lookupId(tx, "DOCTOR_BOOKING_STATUS", key);
}

const admissionInclude = {
  patient: {
    select: {
      id: true,
      fullName: true,
      contactNo: true,
      nicOrPassport: true,
    },
  },
  statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
  carePathwayLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
  dailyNotes: {
    orderBy: { recordedAt: "desc" as const },
    include: {
      recordedBy: { select: { id: true, fullName: true, email: true } },
    },
  },
} as const;

export async function admitPatient(params: {
  patientId: string;
  siteLabel?: string | null;
  carePathwayKey: "OBSERVATION" | "TREATMENT";
  admittedAt?: Date | null;
}) {
  const admittedStatusId = await lookupId(prisma, STATUS_CAT, "ADMITTED");
  const pathwayId = await lookupId(prisma, PATHWAY_CAT, params.carePathwayKey);

  const patient = await prisma.patient.findUnique({
    where: { id: params.patientId },
    select: { id: true },
  });
  if (!patient) {
    const err = new Error("PATIENT_NOT_FOUND") as Error & { code?: string };
    err.code = "PATIENT_NOT_FOUND";
    throw err;
  }

  const open = await prisma.nursingAdmission.findFirst({
    where: {
      patientId: params.patientId,
      dischargedAt: null,
      statusLookup: { lookupKey: "ADMITTED" },
    },
    select: { id: true },
  });
  if (open) {
    const err = new Error("ALREADY_ADMITTED") as Error & { code?: string };
    err.code = "ALREADY_ADMITTED";
    throw err;
  }

  return prisma.nursingAdmission.create({
    data: {
      patientId: params.patientId,
      siteLabel: params.siteLabel?.trim() ? params.siteLabel.trim() : null,
      admittedAt: params.admittedAt ?? undefined,
      statusId: admittedStatusId,
      carePathwayId: pathwayId,
    },
    include: admissionInclude,
  });
}

export async function appendDailyNote(params: {
  nursingAdmissionId: string;
  recordedByUserId: string;
  note: string;
}) {
  const trimmed = params.note.trim();
  if (!trimmed) {
    const err = new Error("NOTE_REQUIRED") as Error & { code?: string };
    err.code = "NOTE_REQUIRED";
    throw err;
  }

  const admission = await prisma.nursingAdmission.findUnique({
    where: { id: params.nursingAdmissionId },
    include: { statusLookup: { select: { lookupKey: true } } },
  });
  if (!admission) {
    const err = new Error("ADMISSION_NOT_FOUND") as Error & { code?: string };
    err.code = "ADMISSION_NOT_FOUND";
    throw err;
  }
  if (admission.statusLookup?.lookupKey !== "ADMITTED" || admission.dischargedAt) {
    const err = new Error("ADMISSION_CLOSED") as Error & { code?: string };
    err.code = "ADMISSION_CLOSED";
    throw err;
  }

  return prisma.nursingDailyNote.create({
    data: {
      nursingAdmissionId: params.nursingAdmissionId,
      recordedByUserId: params.recordedByUserId,
      note: trimmed.slice(0, 8000),
    },
    include: {
      recordedBy: { select: { id: true, fullName: true, email: true } },
    },
  });
}

export async function updateCarePathway(params: {
  nursingAdmissionId: string;
  carePathwayKey: "OBSERVATION" | "TREATMENT";
}) {
  const pathwayId = await lookupId(prisma, PATHWAY_CAT, params.carePathwayKey);

  const admission = await prisma.nursingAdmission.findUnique({
    where: { id: params.nursingAdmissionId },
    include: { statusLookup: { select: { lookupKey: true } } },
  });
  if (!admission) {
    const err = new Error("ADMISSION_NOT_FOUND") as Error & { code?: string };
    err.code = "ADMISSION_NOT_FOUND";
    throw err;
  }
  if (admission.statusLookup?.lookupKey !== "ADMITTED" || admission.dischargedAt) {
    const err = new Error("ADMISSION_CLOSED") as Error & { code?: string };
    err.code = "ADMISSION_CLOSED";
    throw err;
  }

  return prisma.nursingAdmission.update({
    where: { id: params.nursingAdmissionId },
    data: { carePathwayId: pathwayId },
    include: admissionInclude,
  });
}

export async function dischargeAdmission(nursingAdmissionId: string, dischargedAt?: Date | null) {
  const dischargedStatusId = await lookupId(prisma, STATUS_CAT, "DISCHARGED");

  const admission = await prisma.nursingAdmission.findUnique({
    where: { id: nursingAdmissionId },
    include: { statusLookup: { select: { lookupKey: true } } },
  });
  if (!admission) {
    const err = new Error("ADMISSION_NOT_FOUND") as Error & { code?: string };
    err.code = "ADMISSION_NOT_FOUND";
    throw err;
  }
  if (admission.statusLookup?.lookupKey !== "ADMITTED" || admission.dischargedAt) {
    const err = new Error("ADMISSION_CLOSED") as Error & { code?: string };
    err.code = "ADMISSION_CLOSED";
    throw err;
  }
  const resolvedDischargedAt = dischargedAt ?? new Date();
  if (resolvedDischargedAt.getTime() < admission.admittedAt.getTime()) {
    const err = new Error("INVALID_DISCHARGE_TIME") as Error & { code?: string };
    err.code = "INVALID_DISCHARGE_TIME";
    throw err;
  }

  return prisma.nursingAdmission.update({
    where: { id: nursingAdmissionId },
    data: {
      dischargedAt: resolvedDischargedAt,
      statusId: dischargedStatusId,
    },
    include: admissionInclude,
  });
}

/** Creates a booking + visit record for diagnostics; optional attending doctor. */
export async function startNursingEncounter(params: {
  nursingAdmissionId: string;
  requestedDoctorId?: string | null;
  bookingRemark?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const admission = await tx.nursingAdmission.findUnique({
      where: { id: params.nursingAdmissionId },
      include: { statusLookup: { select: { lookupKey: true } } },
    });
    if (!admission) {
      const err = new Error("ADMISSION_NOT_FOUND") as Error & { code?: string };
      err.code = "ADMISSION_NOT_FOUND";
      throw err;
    }
    if (admission.statusLookup?.lookupKey !== "ADMITTED" || admission.dischargedAt) {
      const err = new Error("ADMISSION_CLOSED") as Error & { code?: string };
      err.code = "ADMISSION_CLOSED";
      throw err;
    }

    const bookingTypeId = await getBookingTypeNursingEncounterId(tx);

    const requestedDoctorId =
      params.requestedDoctorId?.trim() ? params.requestedDoctorId.trim() : null;
    const doctorStatusKey = requestedDoctorId ? "PENDING" : "ACCEPTED";
    const doctorStatusId = await getDoctorStatusId(tx, doctorStatusKey);

    const now = new Date();
    const booking = await tx.booking.create({
      data: {
        patientId: admission.patientId,
        scheduledDate: now,
        bookingTypeId,
        nursingAdmissionId: admission.id,
        requestedDoctorId,
        doctorStatusId,
        bookingRemark: params.bookingRemark?.trim()
          ? params.bookingRemark.trim().slice(0, 2000)
          : "In-house nursing encounter",
        status: "In-house nursing",
      },
    });

    await tx.visitRecord.create({
      data: {
        bookingId: booking.id,
        patientId: admission.patientId,
        remark: null,
      },
    });

    return tx.booking.findUnique({
      where: { id: booking.id },
      include: bookingWithDispatchInclude,
    });
  });
}

export async function listActiveAdmissions() {
  const admittedId = await lookupId(prisma, STATUS_CAT, "ADMITTED");

  return prisma.nursingAdmission.findMany({
    where: {
      statusId: admittedId,
      dischargedAt: null,
    },
    orderBy: { admittedAt: "desc" },
    include: admissionInclude,
  });
}

export async function listDischargedAdmissions() {
  const dischargedId = await lookupId(prisma, STATUS_CAT, "DISCHARGED");

  return prisma.nursingAdmission.findMany({
    where: {
      statusId: dischargedId,
      dischargedAt: { not: null },
    },
    orderBy: [{ dischargedAt: "desc" }, { admittedAt: "desc" }],
    include: admissionInclude,
  });
}

export async function listNursingAdmissionsForPatient(patientId: string) {
  const items = await prisma.nursingAdmission.findMany({
    where: { patientId },
    orderBy: { admittedAt: "desc" },
    include: admissionInclude,
  });

  const admissionIds = items.map((a) => a.id);
  const encounterBookings =
    admissionIds.length === 0
      ? []
      : await prisma.booking.findMany({
          where: {
            nursingAdmissionId: { in: admissionIds },
          },
          orderBy: { scheduledDate: "desc" },
          include: bookingWithDispatchInclude,
        });

  const byAdmission = new Map<string, typeof encounterBookings>();
  for (const b of encounterBookings) {
    const aid = b.nursingAdmissionId;
    if (!aid) continue;
    const list = byAdmission.get(aid) ?? [];
    list.push(b);
    byAdmission.set(aid, list);
  }

  return items.map((a) => ({
    ...a,
    encounterBookings: byAdmission.get(a.id) ?? [],
  }));
}
