import type { UpcomingBookingRow } from "@/components/dispatch/types";

export type DispatchRecordRow = UpcomingBookingRow["dispatchRecords"][number];

export type LabSampleTypeLookup = {
  id: string;
  lookupKey: string;
  lookupValue: string;
};

export type InventoryBatchRow = {
  id: string;
  medicineId: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  locationType: string;
  locationId?: string | null;
  medicine?: {
    id: string;
    name: string;
    uom?: string | null;
  };
};

export type IssuedMedicineSampleRow = {
  id: string;
  sampleType: string;
  collectedAt: string;
  labName: string | null;
  statusLabel: string;
};

export type DiagnosticTabId = "remark" | "reports" | "samples" | "medicines";

export type PendingConfirm =
  | null
  | { type: "arrived"; dispatchId: string }
  | { type: "diagnostic"; dispatchId: string }
  | { type: "complete"; dispatchId: string };

export const DIAGNOSTIC_TABS: { id: DiagnosticTabId; label: string }[] = [
  { id: "remark", label: "Remark" },
  { id: "reports", label: "Reports upload" },
  { id: "samples", label: "Samples" },
  { id: "medicines", label: "Medicines" },
];

export function safeFileKeySegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

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

export function diagnosticDispatchForBooking(b: UpcomingBookingRow): DispatchRecordRow | null {
  return b.dispatchRecords.find((dr) => dr.statusLookup?.lookupKey === "DIAGNOSTIC") ?? null;
}

export function preferredDispatchForInventory(b: UpcomingBookingRow): DispatchRecordRow | null {
  return (
    diagnosticDispatchForBooking(b) ??
    arrivedDispatchForBooking(b) ??
    inTransitDispatchForBooking(b) ??
    b.dispatchRecords[0] ??
    null
  );
}
