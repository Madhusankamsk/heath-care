import type { InventoryBatchRow } from "@/components/clients/patient-bookings/types";

type MessageResponse = { message?: string };

async function readJson<T>(res: Response, fallback: T): Promise<T> {
  return (await res.json().catch(() => fallback)) as T;
}

export async function patchDispatchStatusApi(
  dispatchId: string,
  statusLookupKey: "ARRIVED" | "COMPLETED",
  remark?: string | null,
) {
  const res = await fetch(`/api/dispatch/${dispatchId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      statusLookupKey,
      ...(remark !== undefined ? { remark } : {}),
    }),
  });
  const data = await readJson<MessageResponse>(res, {});
  if (!res.ok) throw new Error(data.message || "Update failed");
}

export async function saveVisitDraftApi(bookingId: string, remark: string | null) {
  const res = await fetch(`/api/bookings/${bookingId}/visit-draft`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      remark,
    }),
  });
  const data = await readJson<MessageResponse>(res, {});
  if (!res.ok) throw new Error(data.message || "Failed to save draft");
}

export async function uploadFileApi(file: File, key: string) {
  const up = await fetch("/api/files/upload", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "x-file-key": key,
    },
    body: file,
  });
  const upData = await readJson<{ url?: string; message?: string }>(up, {});
  if (!up.ok) throw new Error(upData.message || "Upload failed");
  if (!upData.url) throw new Error("No file URL returned");
  return upData.url;
}

export async function createDiagnosticReportApi(
  bookingId: string,
  payload: { reportName: string; fileUrl: string },
) {
  const create = await fetch(`/api/bookings/${bookingId}/diagnostic-reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson<MessageResponse>(create, {});
  if (!create.ok) throw new Error(data.message || "Could not save report");
}

export async function createLabSampleApi(
  bookingId: string,
  payload: { sampleTypeLookupId: string; labName: string },
) {
  const res = await fetch(`/api/bookings/${bookingId}/lab-samples`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await readJson<MessageResponse>(res, {});
  if (!res.ok) throw new Error(data.message || "Could not add sample");
}

export async function deleteLabSampleApi(bookingId: string, sampleId: string) {
  const res = await fetch(`/api/bookings/${bookingId}/lab-samples/${sampleId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await readJson<MessageResponse>(res, {});
    throw new Error(data.message || "Could not remove sample");
  }
}

export async function listInventoryBatchesApi() {
  const res = await fetch("/api/inventory/batches", { cache: "no-store" });
  const data = await readJson<InventoryBatchRow[] | MessageResponse>(res, []);
  if (!res.ok) {
    if (typeof data === "object" && !Array.isArray(data) && data?.message) {
      throw new Error(data.message);
    }
    throw new Error("Could not load team inventory");
  }
  return Array.isArray(data) ? data : [];
}

export type IssueMedicineApiResponse = {
  id?: string;
  quantity?: number;
  createdAt?: string;
  batch?: { batchNo?: string | null };
  medicine?: { name?: string | null };
  statusLookup?: { lookupValue?: string | null; lookupKey?: string | null } | null;
};

export async function issueMedicineToPatientApi(payload: {
  batchId: string;
  quantity: number;
  patientId: string;
  bookingId?: string;
}) {
  const res = await fetch("/api/inventory/stock-movements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      batchId: payload.batchId,
      quantity: payload.quantity,
      toLocationType: "PATIENT",
      toLocationId: payload.patientId,
      bookingId: payload.bookingId,
    }),
  });
  const data = await readJson<IssueMedicineApiResponse & MessageResponse>(res, {});
  if (!res.ok) throw new Error(data.message || "Could not issue medicine");
  return data;
}
