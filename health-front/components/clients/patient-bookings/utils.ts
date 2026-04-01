"use client";

import type { UpcomingBookingRow } from "@/components/dispatch/types";

type DispatchRecordRow = UpcomingBookingRow["dispatchRecords"][number];

export function safeFileKeySegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

/** Visit remark for current schema with fallback for legacy rows. */
export function diagnosisRemarkFromVisit(b: UpcomingBookingRow): string {
  const remark = b.visitRecord?.remark?.trim() ?? "";
  return remark;
}

export function inTransitDispatchForBooking(b: UpcomingBookingRow): DispatchRecordRow | null {
  return b.dispatchRecords.find((dr) => dr.statusLookup?.lookupKey === "IN_TRANSIT") ?? null;
}

export function arrivedDispatchForBooking(b: UpcomingBookingRow): DispatchRecordRow | null {
  return b.dispatchRecords.find((dr) => dr.statusLookup?.lookupKey === "ARRIVED") ?? null;
}

export function preferredDispatchForInventory(b: UpcomingBookingRow): DispatchRecordRow | null {
  return (
    arrivedDispatchForBooking(b) ?? inTransitDispatchForBooking(b) ?? b.dispatchRecords[0] ?? null
  );
}
