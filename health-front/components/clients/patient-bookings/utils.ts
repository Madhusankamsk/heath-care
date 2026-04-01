"use client";

import type { UpcomingBookingRow } from "@/components/dispatch/types";

type DispatchRecordRow = UpcomingBookingRow["dispatchRecords"][number];

export function safeFileKeySegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

/** Combined clinical notes + diagnosis as one "diagnosis remark" (legacy rows may have both). */
export function diagnosisRemarkFromVisit(b: UpcomingBookingRow): string {
  const c = b.visitRecord?.clinicalNotes?.trim() ?? "";
  const d = b.visitRecord?.diagnosis?.trim() ?? "";
  if (!c && !d) return "";
  if (!c) return d;
  if (!d) return c;
  if (c === d) return d;
  return `${c}\n\n${d}`;
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
