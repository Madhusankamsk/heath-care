import prisma from "../prisma/client";

import { patientTextSearchWhere } from "../lib/searchWhere";

const OPD_STATUS_CATEGORY = "OPD_STATUS";
const DEFAULT_STATUS_KEY = "WAITING";

type OpdStatusRow = {
  id: string;
  lookupKey: string;
  lookupValue: string;
};

async function getOpdStatusById(id: string): Promise<OpdStatusRow | null> {
  return prisma.lookup.findFirst({
    where: { id, category: { categoryName: OPD_STATUS_CATEGORY } },
    select: { id: true, lookupKey: true, lookupValue: true },
  });
}

async function getOpdStatusByKey(lookupKey: string): Promise<OpdStatusRow | null> {
  return prisma.lookup.findFirst({
    where: {
      lookupKey,
      category: { categoryName: OPD_STATUS_CATEGORY },
    },
    select: { id: true, lookupKey: true, lookupValue: true },
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function startOfTomorrow() {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

export const opdQueueInclude = {
  patient: {
    select: {
      id: true,
      fullName: true,
      shortName: true,
      nicOrPassport: true,
      contactNo: true,
    },
  },
  statusLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
  pickedBy: {
    select: { id: true, fullName: true, email: true },
  },
  booking: {
    select: { id: true, isOpd: true, patientId: true, requestedDoctorId: true },
  },
} as const;

export async function listTodayOpdQueue(params: { skip: number; take: number; q?: string }) {
  const dateWhere = {
    visitDate: {
      gte: startOfToday(),
      lt: startOfTomorrow(),
    },
  };
  const where = params.q?.trim()
    ? {
        AND: [
          dateWhere,
          { patient: { is: patientTextSearchWhere(params.q) } },
        ],
      }
    : dateWhere;
  const [total, items] = await prisma.$transaction([
    prisma.opdQueue.count({ where }),
    prisma.opdQueue.findMany({
      where,
      orderBy: [{ tokenNo: "desc" }, { visitDate: "desc" }],
      skip: params.skip,
      take: params.take,
      include: opdQueueInclude,
    }),
  ]);
  return { items, total };
}

/** Today's queue for OPD doctors: waiting tokens plus this doctor's in-consultation row. */
export async function listTodayOpdDoctorQueue(params: {
  doctorUserId: string;
  skip: number;
  take: number;
}) {
  const dateWhere = {
    visitDate: {
      gte: startOfToday(),
      lt: startOfTomorrow(),
    },
  };
  const where = {
    AND: [
      dateWhere,
      {
        OR: [
          { statusLookup: { lookupKey: "WAITING" } },
          {
            AND: [
              { statusLookup: { lookupKey: "IN_CONSULTATION" } },
              { pickedByUserId: params.doctorUserId },
            ],
          },
        ],
      },
    ],
  };
  const [total, items] = await prisma.$transaction([
    prisma.opdQueue.count({ where }),
    prisma.opdQueue.findMany({
      where,
      orderBy: [{ tokenNo: "asc" }, { visitDate: "asc" }],
      skip: params.skip,
      take: params.take,
      include: opdQueueInclude,
    }),
  ]);
  return { items, total };
}

export async function createOpdQueueEntry(payload: {
  patientId: string;
  statusLookupId?: string | null;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: payload.patientId },
    select: { id: true },
  });
  if (!patient) {
    const err = new Error("PATIENT_NOT_FOUND") as Error & { code?: string };
    err.code = "PATIENT_NOT_FOUND";
    throw err;
  }

  const statusRow =
    payload.statusLookupId?.trim()
      ? await getOpdStatusById(payload.statusLookupId.trim())
      : await getOpdStatusByKey(DEFAULT_STATUS_KEY);
  if (!statusRow) {
    const err = new Error("INVALID_STATUS") as Error & { code?: string };
    err.code = "INVALID_STATUS";
    throw err;
  }

  return prisma.opdQueue.create({
    data: {
      patientId: payload.patientId,
      statusId: statusRow.id,
      status: statusRow.lookupValue,
    },
    include: opdQueueInclude,
  });
}

export async function updateOpdQueueEntryStatus(id: string, statusLookupId: string) {
  const existing = await prisma.opdQueue.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    const err = new Error("QUEUE_NOT_FOUND") as Error & { code?: string };
    err.code = "QUEUE_NOT_FOUND";
    throw err;
  }

  const statusRow = await getOpdStatusById(statusLookupId);
  if (!statusRow) {
    const err = new Error("INVALID_STATUS") as Error & { code?: string };
    err.code = "INVALID_STATUS";
    throw err;
  }

  return prisma.opdQueue.update({
    where: { id },
    data: {
      statusId: statusRow.id,
      status: statusRow.lookupValue,
    },
    include: opdQueueInclude,
  });
}

export async function deleteOpdQueueEntry(id: string) {
  return prisma.opdQueue.delete({ where: { id } });
}
