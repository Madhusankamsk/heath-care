import prisma from "../prisma/client";

import { andBookingSearch, andPatientSearch } from "../lib/searchWhere";
import { resolveBookingListScope, type BookingListScope } from "./bookingService";

export type GlobalSearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type DashboardGlobalSearchResult = {
  patients: GlobalSearchHit[];
  bookings: GlobalSearchHit[];
};

const LIMIT = 8;

function bookingBaseWhere(
  scope: BookingListScope,
  userId: string | undefined,
): Parameters<typeof andBookingSearch>[0] {
  if (scope === "own" && userId) {
    return { requestedDoctorId: userId };
  }
  return undefined;
}

/**
 * MVP global search (patients + bookings). Caller must enforce `dashboard:global_search`;
 * module-level access is applied here from permission keys.
 */
export async function dashboardGlobalSearch(params: {
  userId: string | undefined;
  permissionKeys: string[];
  q: string;
}): Promise<DashboardGlobalSearchResult> {
  const q = params.q.trim();
  if (!q) {
    return { patients: [], bookings: [] };
  }

  const canPatient =
    params.permissionKeys.includes("patients:list") ||
    params.permissionKeys.includes("patients:read");
  const canBooking = params.permissionKeys.includes("bookings:list");
  const scope = resolveBookingListScope(params.permissionKeys);

  const [patientRows, bookingRows] = await Promise.all([
    canPatient
      ? prisma.patient.findMany({
          where: andPatientSearch({}, q),
          take: LIMIT,
          orderBy: { fullName: "asc" },
          select: {
            id: true,
            fullName: true,
            nicOrPassport: true,
            contactNo: true,
          },
        })
      : Promise.resolve([]),
    canBooking
      ? prisma.booking.findMany({
          where: andBookingSearch(bookingBaseWhere(scope, params.userId), q),
          take: LIMIT,
          orderBy: { scheduledDate: "desc" },
          select: {
            id: true,
            scheduledDate: true,
            bookingRemark: true,
            patient: { select: { id: true, fullName: true } },
            doctorStatusLookup: { select: { lookupValue: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    patients: patientRows.map((p) => {
      const bits = [p.nicOrPassport, p.contactNo].filter(Boolean) as string[];
      return {
        id: p.id,
        title: p.fullName,
        subtitle: bits.length > 0 ? bits.join(" · ") : "Patient",
        href: `/dashboard/clients/patient/${p.id}`,
      };
    }),
    bookings: bookingRows.map((b) => {
      const dateStr =
        b.scheduledDate && !Number.isNaN(new Date(b.scheduledDate).getTime())
          ? new Date(b.scheduledDate).toISOString().slice(0, 10)
          : null;
      const remark = b.bookingRemark?.trim();
      const subtitleParts = [
        dateStr,
        b.doctorStatusLookup?.lookupValue ?? null,
        remark ? (remark.length > 80 ? `${remark.slice(0, 77)}…` : remark) : null,
      ].filter(Boolean) as string[];
      return {
        id: b.id,
        title: b.patient?.fullName ?? "Booking",
        subtitle: subtitleParts.length > 0 ? subtitleParts.join(" · ") : "Home visit booking",
        href: `/dashboard/bookings/manage-bookings?q=${encodeURIComponent(b.id)}`,
      };
    }),
  };
}
