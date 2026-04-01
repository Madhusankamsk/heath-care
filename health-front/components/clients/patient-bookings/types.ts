"use client";

export type LabSampleTypeLookup = {
  id: string;
  lookupKey: string;
  lookupValue: string;
};

export type DiagnosticTabId = "remark" | "reports" | "samples" | "medicines";
export type PendingConfirm =
  | null
  | { type: "arrived"; dispatchId: string }
  | { type: "complete"; dispatchId: string };
export type SampleForm = { sampleTypeLookupId: string; labName: string };

export const DIAGNOSTIC_TABS: { id: DiagnosticTabId; label: string }[] = [
  { id: "remark", label: "Remark" },
  { id: "reports", label: "Reports upload" },
  { id: "samples", label: "Samples" },
  { id: "medicines", label: "Medicines" },
];

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
