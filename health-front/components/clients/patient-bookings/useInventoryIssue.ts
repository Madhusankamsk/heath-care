"use client";

import { useState } from "react";

import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type { InventoryBatchRow, QueuedMedicineRow } from "@/components/clients/patient-bookings/types";
import { preferredDispatchForInventory } from "@/components/clients/patient-bookings/utils";
import { listInventoryBatchesApi } from "@/lib/patientBookingsApi";
import { toast } from "@/lib/toast";

export function useInventoryIssue() {
  const [inventoryBatches, setInventoryBatches] = useState<InventoryBatchRow[] | null>(null);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [selectedBatchByBookingId, setSelectedBatchByBookingId] = useState<Record<string, string>>({});
  const [issueQtyByBookingId, setIssueQtyByBookingId] = useState<Record<string, string>>({});
  const [issuingBookingId, setIssuingBookingId] = useState<string | null>(null);
  const [queuedMedicinesByBookingId, setQueuedMedicinesByBookingId] = useState<
    Record<string, QueuedMedicineRow[]>
  >({});

  async function ensureInventoryLoaded() {
    if (inventoryBatches !== null || inventoryError) return;
    try {
      const batches = await listInventoryBatchesApi();
      setInventoryBatches(batches);
    } catch (e) {
      setInventoryError(e instanceof Error ? e.message : "Could not load team inventory");
    }
  }

  function teamLeaderBatchesForBooking(b: UpcomingBookingRow) {
    if (!inventoryBatches) return [];
    const sourceDispatch = preferredDispatchForInventory(b);
    let leadUserId = sourceDispatch?.assignments.find((a) => a.isTeamLeader)?.user.id;
    const isInHouse = b.bookingTypeLookup?.lookupKey === "IN_HOUSE_NURSING";
    if (!leadUserId && isInHouse && b.inHouseDetail?.assignedDoctor?.id) {
      leadUserId = b.inHouseDetail.assignedDoctor.id;
    }
    if (!leadUserId && isInHouse) {
      return inventoryBatches
        .filter((row) => row.quantity > 0)
        .sort((a, z) => new Date(a.expiryDate).getTime() - new Date(z.expiryDate).getTime());
    }
    if (!leadUserId) return [];
    return inventoryBatches
      .filter(
        (batch) =>
          batch.locationId === leadUserId &&
          batch.quantity > 0 &&
          (batch.locationType === "NURSE" || batch.locationType === "USER"),
      )
      .sort((a, z) => new Date(a.expiryDate).getTime() - new Date(z.expiryDate).getTime());
  }

  async function issueMedicineToPatient(b: UpcomingBookingRow) {
    const batchId = selectedBatchByBookingId[b.id];
    const qtyText = issueQtyByBookingId[b.id] ?? "1";
    const quantity = Number.parseInt(qtyText, 10);
    if (!batchId) {
      toast.error("Select a medicine batch.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Enter a valid quantity.");
      return;
    }
    if (!b.patient?.id) {
      toast.error("Patient reference is missing for this booking.");
      return;
    }

    const selectedBatch = teamLeaderBatchesForBooking(b).find((row) => row.id === batchId);
    if (!selectedBatch) {
      toast.error("Selected medicine batch is no longer available.");
      return;
    }
    if (quantity > selectedBatch.quantity) {
      toast.error("Quantity is higher than available stock.");
      return;
    }

    setIssuingBookingId(b.id);
    const queued: QueuedMedicineRow = {
      id: `${b.id}:${batchId}:${Date.now()}`,
      batchId,
      medicineId: selectedBatch.medicineId,
      medicineName: selectedBatch.medicine?.name ?? "Medicine",
      batchNo: selectedBatch.batchNo,
      quantity,
      bookingId: b.id,
      patientId: b.patient.id,
      unitLabel: selectedBatch.medicine?.uom?.trim() || "units",
      unitPrice: Number(selectedBatch.buyingPrice ?? 0),
    };
    setQueuedMedicinesByBookingId((prev) => ({
      ...prev,
      [b.id]: [...(prev[b.id] ?? []), queued],
    }));
    toast.success("Medicine added to bill.");
    setIssueQtyByBookingId((prev) => ({ ...prev, [b.id]: "1" }));
    setSelectedBatchByBookingId((prev) => ({ ...prev, [b.id]: "" }));
    setIssuingBookingId(null);
  }

  function queuedMedicinesForBooking(bookingId: string) {
    return queuedMedicinesByBookingId[bookingId] ?? [];
  }

  function removeQueuedMedicine(bookingId: string, queuedId: string) {
    setQueuedMedicinesByBookingId((prev) => ({
      ...prev,
      [bookingId]: (prev[bookingId] ?? []).filter((row) => row.id !== queuedId),
    }));
  }

  function clearQueuedMedicinesForBooking(bookingId: string) {
    setQueuedMedicinesByBookingId((prev) => {
      const next = { ...prev };
      delete next[bookingId];
      return next;
    });
  }

  return {
    inventoryBatches,
    inventoryError,
    selectedBatchByBookingId,
    issueQtyByBookingId,
    issuingBookingId,
    ensureInventoryLoaded,
    teamLeaderBatchesForBooking,
    issueMedicineToPatient,
    queuedMedicinesForBooking,
    removeQueuedMedicine,
    clearQueuedMedicinesForBooking,
    setSelectedBatchByBookingId,
    setIssueQtyByBookingId,
  };
}
