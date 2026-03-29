import prisma from "../prisma/client";
import type { BookingListScope } from "./bookingService";

const dispatchAssignmentUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: { select: { id: true, roleName: true } },
} as const;

async function getDispatchStatusLookupId(lookupKey: string): Promise<string | null> {
  const cat = await prisma.lookupCategory.findUnique({
    where: { categoryName: "DISPATCH_STATUS" },
  });
  if (!cat) return null;
  const row = await prisma.lookup.findFirst({
    where: { categoryId: cat.id, lookupKey },
  });
  return row?.id ?? null;
}

const upcomingInclude = {
  patient: { select: { id: true, fullName: true, contactNo: true } },
  requestedDoctor: { select: { id: true, fullName: true, email: true } },
  doctorStatusLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
  dispatchRecords: {
    orderBy: { dispatchedAt: "desc" as const },
    take: 1,
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

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export async function listUpcomingAcceptedForDispatch(params: {
  userId: string | undefined;
  scope: BookingListScope;
}) {
  const startOfToday = startOfUtcDay(new Date());

  const scopeWhere =
    params.scope === "own" && params.userId
      ? { requestedDoctorId: params.userId }
      : {};

  return prisma.booking.findMany({
    where: {
      doctorStatusLookup: { lookupKey: "ACCEPTED" },
      OR: [{ scheduledDate: null }, { scheduledDate: { gte: startOfToday } }],
      /** Not yet dispatched — once a dispatch exists, the job moves to Ongoing. */
      dispatchRecords: { none: {} },
      ...scopeWhere,
    },
    orderBy: { scheduledDate: { sort: "asc", nulls: "last" } },
    include: upcomingInclude,
  });
}

/** Accepted bookings with an in-transit or arrived dispatch and no visit started yet. */
export async function listOngoingForDispatch(params: {
  userId: string | undefined;
  scope: BookingListScope;
}) {
  const scopeWhere =
    params.scope === "own" && params.userId
      ? { requestedDoctorId: params.userId }
      : {};

  return prisma.booking.findMany({
    where: {
      doctorStatusLookup: { lookupKey: "ACCEPTED" },
      visitRecord: null,
      OR: [
        { dispatchRecords: { some: { statusLookup: { lookupKey: "IN_TRANSIT" } } } },
        { dispatchRecords: { some: { statusLookup: { lookupKey: "ARRIVED" } } } },
      ],
      ...scopeWhere,
    },
    orderBy: { scheduledDate: { sort: "asc", nulls: "last" } },
    include: upcomingInclude,
  });
}

function buildAssignmentsWithLead(orderedUserIds: string[], leadUserId: string) {
  return orderedUserIds.map((userId) => ({
    userId,
    isTeamLeader: userId === leadUserId,
  }));
}

/** Active users eligible to be placed on a dispatch (same pool as medical team member picker). */
export async function listDispatchMemberCandidates() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { id: true, roleName: true } },
    },
  });
}

/**
 * Creates dispatch with caller-chosen `vehicleId` and `leadUserId` (for this run only).
 * `medicalTeamId` must exist (context / default source in UI) but the saved team is not updated.
 * `memberUserIds` may include any active staff.
 */
export async function createDispatchFromTeam(
  bookingId: string,
  medicalTeamId: string,
  memberUserIds: string[],
  vehicleId: string,
  leadUserId: string,
  access?: { userId: string | undefined; scope: BookingListScope },
) {
  const inTransitId = await getDispatchStatusLookupId("IN_TRANSIT");
  if (!inTransitId) {
    throw new Error("DISPATCH_STATUS IN_TRANSIT lookup missing");
  }

  const normalizedMembers = [
    ...new Set(
      memberUserIds.map((id) => id.trim()).filter(Boolean),
    ),
  ];

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        doctorStatusLookup: { select: { lookupKey: true } },
        dispatchRecords: {
          include: { statusLookup: { select: { lookupKey: true } } },
        },
      },
    });

    if (!booking) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }

    if (
      access?.scope === "own" &&
      access.userId &&
      booking.requestedDoctorId !== access.userId
    ) {
      const err = new Error("BOOKING_NOT_FOUND") as Error & { code?: string };
      err.code = "BOOKING_NOT_FOUND";
      throw err;
    }

    if (booking.doctorStatusLookup?.lookupKey !== "ACCEPTED") {
      const err = new Error("BOOKING_NOT_ACCEPTED") as Error & { code?: string };
      err.code = "BOOKING_NOT_ACCEPTED";
      throw err;
    }

    const hasInTransit = booking.dispatchRecords.some(
      (d) => d.statusLookup?.lookupKey === "IN_TRANSIT",
    );
    if (hasInTransit) {
      const err = new Error("DISPATCH_ALREADY_OPEN") as Error & { code?: string };
      err.code = "DISPATCH_ALREADY_OPEN";
      throw err;
    }

    const hasArrived = booking.dispatchRecords.some(
      (d) => d.statusLookup?.lookupKey === "ARRIVED",
    );
    if (hasArrived) {
      const err = new Error("DISPATCH_ALREADY_COMPLETE") as Error & { code?: string };
      err.code = "DISPATCH_ALREADY_COMPLETE";
      throw err;
    }

    const team = await tx.medicalTeam.findUnique({
      where: { id: medicalTeamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, isActive: true } },
          },
        },
      },
    });

    if (!team) {
      const err = new Error("TEAM_NOT_FOUND") as Error & { code?: string };
      err.code = "TEAM_NOT_FOUND";
      throw err;
    }

    if (!normalizedMembers.length) {
      const err = new Error("MEMBERS_REQUIRED") as Error & { code?: string };
      err.code = "MEMBERS_REQUIRED";
      throw err;
    }

    const activeUsers = await tx.user.findMany({
      where: { id: { in: normalizedMembers }, isActive: true },
      select: { id: true },
    });
    if (activeUsers.length !== normalizedMembers.length) {
      const err = new Error("INVALID_DISPATCH_USER") as Error & { code?: string };
      err.code = "INVALID_DISPATCH_USER";
      throw err;
    }

    const vid = vehicleId.trim();
    const vehicleRow = await tx.vehicle.findUnique({ where: { id: vid } });
    if (!vehicleRow) {
      const err = new Error("INVALID_VEHICLE") as Error & { code?: string };
      err.code = "INVALID_VEHICLE";
      throw err;
    }

    const lid = leadUserId.trim();
    if (!lid || !normalizedMembers.includes(lid)) {
      const err = new Error("INVALID_LEAD") as Error & { code?: string };
      err.code = "INVALID_LEAD";
      throw err;
    }

    const assignments = buildAssignmentsWithLead(normalizedMembers, lid);

    const dispatch = await tx.dispatchRecord.create({
      data: {
        bookingId,
        vehicleId: vid,
        statusId: inTransitId,
      },
      include: {
        statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        vehicle: { select: { id: true, vehicleNo: true, model: true } },
      },
    });

    await tx.dispatchAssignment.createMany({
      data: assignments.map((a) => ({
        dispatchId: dispatch.id,
        userId: a.userId,
        isTeamLeader: a.isTeamLeader,
      })),
    });

    const full = await tx.dispatchRecord.findUnique({
      where: { id: dispatch.id },
      include: {
        statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
        vehicle: { select: { id: true, vehicleNo: true, model: true } },
        assignments: {
          include: {
            user: { select: dispatchAssignmentUserSelect },
          },
        },
      },
    });

    return full!;
  });
}

export async function updateDispatchStatus(
  dispatchId: string,
  statusLookupKey: "ARRIVED",
  access?: { userId: string | undefined; scope: BookingListScope },
) {
  if (statusLookupKey !== "ARRIVED") {
    const err = new Error("INVALID_STATUS") as Error & { code?: string };
    err.code = "INVALID_STATUS";
    throw err;
  }

  const arrivedId = await getDispatchStatusLookupId("ARRIVED");
  if (!arrivedId) {
    throw new Error("DISPATCH_STATUS ARRIVED lookup missing");
  }

  const dispatch = await prisma.dispatchRecord.findUnique({
    where: { id: dispatchId },
    include: {
      statusLookup: { select: { lookupKey: true } },
      booking: { select: { requestedDoctorId: true } },
    },
  });

  if (!dispatch) {
    const err = new Error("DISPATCH_NOT_FOUND") as Error & { code?: string };
    err.code = "DISPATCH_NOT_FOUND";
    throw err;
  }

  if (
    access?.scope === "own" &&
    access.userId &&
    dispatch.booking.requestedDoctorId !== access.userId
  ) {
    const err = new Error("DISPATCH_NOT_FOUND") as Error & { code?: string };
    err.code = "DISPATCH_NOT_FOUND";
    throw err;
  }

  if (dispatch.statusLookup?.lookupKey !== "IN_TRANSIT") {
    const err = new Error("INVALID_TRANSITION") as Error & { code?: string };
    err.code = "INVALID_TRANSITION";
    throw err;
  }

  return prisma.dispatchRecord.update({
    where: { id: dispatchId },
    data: { statusId: arrivedId },
    include: {
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
      vehicle: { select: { id: true, vehicleNo: true, model: true } },
      assignments: {
        include: {
          user: { select: dispatchAssignmentUserSelect },
        },
      },
      booking: {
        select: {
          id: true,
          patient: { select: { id: true, fullName: true } },
        },
      },
    },
  });
}
