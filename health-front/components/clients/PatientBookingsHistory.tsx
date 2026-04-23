"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { BookingDetailContent } from "@/components/clients/patient-bookings/BookingDetailContent";
import { PatientBookingCard } from "@/components/clients/patient-bookings/PatientBookingCard";
import type { DiagnosticTabId, LabSampleTypeLookup, PendingConfirm } from "@/components/clients/patient-bookings/types";
import { useInventoryIssue } from "@/components/clients/patient-bookings/useInventoryIssue";
import { usePatientBookingActions } from "@/components/clients/patient-bookings/usePatientBookingActions";
import { issuedMedicineRowsFromVisit } from "@/components/clients/patient-bookings/utils";
import {
  completeNursingEncounterVisitApi,
  completeOpdConsultationApi,
  type CompletionMedicinePayload,
} from "@/lib/patientBookingsApi";

export type { LabSampleTypeLookup } from "@/components/clients/patient-bookings/types";

type PatientBookingsHistoryProps = {
  bookings: UpcomingBookingRow[];
  /** `dispatch:update` — Mark arrived and Complete dispatch */
  canUpdateDispatch?: boolean;
  /** `bookings:update` — Save draft (diagnosis remark); booking remark is read-only here */
  canSaveVisitDraft?: boolean;
  /** From `/api/lookups?category=LAB_SAMPLE_TYPE` — sample type dropdown */
  labSampleTypeLookups?: LabSampleTypeLookup[];
};

export function PatientBookingsHistory({
  bookings,
  canUpdateDispatch = false,
  canSaveVisitDraft = false,
  labSampleTypeLookups = [],
}: PatientBookingsHistoryProps) {
  const list = Array.isArray(bookings) ? bookings : [];
  const router = useRouter();
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [diagnosticTabByBookingId, setDiagnosticTabByBookingId] = useState<
    Record<string, DiagnosticTabId>
  >({});
  const [busyOpdQueueId, setBusyOpdQueueId] = useState<string | null>(null);
  const [busyNursingBookingId, setBusyNursingBookingId] = useState<string | null>(null);

  /** OPD has no dispatch — still allow issuing from nurse stock when user can update bookings. */
  const inventoryFeatureEnabled =
    canUpdateDispatch ||
    (canSaveVisitDraft &&
      list.some(
        (row) => row.bookingTypeLookup?.lookupKey === "OPD",
      ));
  const bookingActions = usePatientBookingActions(() => {
      setPendingConfirm(null);
      router.refresh();
  });
  const inventory = useInventoryIssue();

  const detailBooking = detailBookingId
    ? list.find((x) => x.id === detailBookingId)
    : null;

  function queuedMedicinePayload(bookingId: string): CompletionMedicinePayload[] {
    return inventory.queuedMedicinesForBooking(bookingId).map((row) => ({
      batchId: row.batchId,
      quantity: row.quantity,
      bookingId: row.bookingId,
      patientId: row.patientId,
    }));
  }

  async function completeNursingEncounter(bookingId: string) {
    const activeBooking = list.find((row) => row.id === bookingId);
    const remarkText = activeBooking
      ? bookingActions.diagnosisRemarkDraftForBooking(activeBooking).trim()
      : "";
    setBusyNursingBookingId(bookingId);
    try {
      const medicines =
        activeBooking != null ? queuedMedicinePayload(activeBooking.id) : [];
      const result = await completeNursingEncounterVisitApi(bookingId, {
        ...(remarkText ? { remark: remarkText } : {}),
        medicines,
      });
      if (activeBooking) {
        inventory.clearQueuedMedicinesForBooking(activeBooking.id);
      }
      if (result.visitInvoiceId) {
        window.open(
          `/api/invoices/${encodeURIComponent(result.visitInvoiceId)}/pdf`,
          "_blank",
          "noopener,noreferrer",
        );
      }
      toast.success("Visit completed.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to complete visit");
    } finally {
      setBusyNursingBookingId(null);
    }
  }

  async function completeOpdConsultation(queueId: string) {
    const activeBooking = list.find((row) => row.opdQueueEntry?.id === queueId);
    const remarkText = activeBooking
      ? bookingActions.diagnosisRemarkDraftForBooking(activeBooking).trim()
      : "";
    setBusyOpdQueueId(queueId);
    try {
      const medicines =
        activeBooking != null ? queuedMedicinePayload(activeBooking.id) : [];
      await completeOpdConsultationApi(queueId, {
        ...(remarkText ? { remark: remarkText } : {}),
        medicines,
      });
      if (activeBooking) {
        inventory.clearQueuedMedicinesForBooking(activeBooking.id);
      }
      toast.success("OPD consultation completed.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to complete OPD visit");
    } finally {
      setBusyOpdQueueId(null);
    }
  }

  if (list.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No visit or OPD bookings recorded for this patient yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {list.map((b) => {
        const activeDiagnosticTab = diagnosticTabByBookingId[b.id] ?? "remark";
        const sampleForm = bookingActions.sampleFormForBooking(b);
        const issuedMedicineSamples = issuedMedicineRowsFromVisit(b);
        const options = inventory.teamLeaderBatchesForBooking(b);
        const selectedBatchId = inventory.selectedBatchByBookingId[b.id] ?? "";
        const qtyText = inventory.issueQtyByBookingId[b.id] ?? "1";
        const queuedMedicines = inventory.queuedMedicinesForBooking(b.id);

        return (
          <PatientBookingCard
            key={b.id}
            b={b}
            canUpdateDispatch={canUpdateDispatch}
            canSaveVisitDraft={canSaveVisitDraft}
            busyDispatchId={bookingActions.busyDispatchId}
            detailBookingId={detailBookingId}
            onToggleDetail={(bookingId) =>
              setDetailBookingId((current) => (current === bookingId ? null : bookingId))
            }
            onSetPendingArrived={(dispatchId) => setPendingConfirm({ type: "arrived", dispatchId })}
            onSetPendingComplete={(dispatchId) => setPendingConfirm({ type: "complete", dispatchId })}
            activeDiagnosticTab={activeDiagnosticTab}
            setActiveDiagnosticTab={(tab) =>
              setDiagnosticTabByBookingId((prev) => ({ ...prev, [b.id]: tab }))
            }
            diagnosisRemark={bookingActions.diagnosisRemarkDraftForBooking(b)}
            setDiagnosisRemark={(value) => bookingActions.setDiagnosisRemarkDraft(b.id, value)}
            saveVisitDraftDisabled={
              bookingActions.busyDispatchId !== null ||
              bookingActions.savingBookingId !== null ||
              bookingActions.uploadingReportBookingId !== null ||
              bookingActions.addingSampleBookingId !== null ||
              bookingActions.removingSampleId !== null ||
              (b.opdQueueEntry?.id != null && busyOpdQueueId === b.opdQueueEntry.id) ||
              busyNursingBookingId === b.id
            }
            savingBookingId={bookingActions.savingBookingId}
            onSaveVisitDraft={() => void bookingActions.saveVisitDraftForBooking(b)}
            uploadingReportBookingId={bookingActions.uploadingReportBookingId}
            onUploadReports={(files) => void bookingActions.uploadReportsForBooking(b, files)}
            sampleForm={sampleForm}
            setSampleForm={(next) => bookingActions.setSampleFormForBooking(b.id, next)}
            addingSampleBookingId={bookingActions.addingSampleBookingId}
            onSubmitLabSample={() => void bookingActions.submitLabSample(b)}
            removingSampleId={bookingActions.removingSampleId}
            onRemoveLabSample={(sampleId) => void bookingActions.removeLabSample(b, sampleId)}
            labSampleTypeLookups={labSampleTypeLookups}
            issuedMedicineSamples={issuedMedicineSamples}
            inventoryFeatureEnabled={inventoryFeatureEnabled}
            inventoryError={inventory.inventoryError}
            inventoryBatches={inventory.inventoryBatches}
            onEnsureInventoryLoaded={() => void inventory.ensureInventoryLoaded()}
            teamLeaderOptions={options}
            selectedBatchId={selectedBatchId}
            onSelectBatch={(batchId) =>
              inventory.setSelectedBatchByBookingId((prev) => ({ ...prev, [b.id]: batchId }))
            }
            qtyText={qtyText}
            onChangeQty={(qty) =>
              inventory.setIssueQtyByBookingId((prev) => ({ ...prev, [b.id]: qty }))
            }
            issuingBookingId={inventory.issuingBookingId}
            onIssueMedicine={() => void inventory.issueMedicineToPatient(b)}
            queuedMedicines={queuedMedicines}
            onRemoveQueuedMedicine={(queuedId) => inventory.removeQueuedMedicine(b.id, queuedId)}
            onCompleteOpdConsultation={(queueId) => void completeOpdConsultation(queueId)}
            opdCompleting={
              b.opdQueueEntry?.id != null && busyOpdQueueId === b.opdQueueEntry.id
            }
            onCompleteNursingEncounter={(bid) => void completeNursingEncounter(bid)}
            nursingCompleting={busyNursingBookingId === b.id}
          />
        );
      })}

      <ConfirmModal
        open={pendingConfirm?.type === "arrived"}
        title="Mark crew as arrived?"
        message="Confirm the team has arrived on site for this dispatch."
        confirmLabel="Yes, mark arrived"
        cancelLabel="Cancel"
        isConfirming={
          pendingConfirm?.type === "arrived" &&
          bookingActions.busyDispatchId === pendingConfirm.dispatchId
        }
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (pendingConfirm?.type === "arrived") {
            void bookingActions.patchDispatchStatus(pendingConfirm.dispatchId, "ARRIVED");
            setPendingConfirm(null);
          }
        }}
      />

      <ConfirmModal
        open={pendingConfirm?.type === "complete"}
        title="Complete this visit?"
        message="This marks the dispatch completed and closes the visit. Make sure notes and billing steps are done."
        confirmLabel="Complete visit"
        cancelLabel="Cancel"
        isConfirming={
          pendingConfirm?.type === "complete" &&
          bookingActions.busyDispatchId === pendingConfirm.dispatchId
        }
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (pendingConfirm?.type === "complete") {
            const activeBooking = list.find((row) =>
              row.dispatchRecords.some((dr) => dr.id === pendingConfirm.dispatchId),
            );
            const remarkText = activeBooking
              ? bookingActions.diagnosisRemarkDraftForBooking(activeBooking).trim()
              : "";
            const medicines = activeBooking ? queuedMedicinePayload(activeBooking.id) : [];
            void (async () => {
              const ok = await bookingActions.patchDispatchStatus(
                pendingConfirm.dispatchId,
                "COMPLETED",
                remarkText ? remarkText : null,
                medicines,
              );
              if (ok && activeBooking) {
                inventory.clearQueuedMedicinesForBooking(activeBooking.id);
              }
            })();
            setPendingConfirm(null);
          }
        }}
      />

      <ModalShell
        open={detailBookingId !== null && detailBooking !== undefined}
        onClose={() => setDetailBookingId(null)}
        titleId="patient-booking-detail"
        title="Booking details"
        subtitle={detailBooking ? detailBooking.id : ""}
        maxWidthClass="max-w-3xl"
      >
        {detailBooking ? (
          <div className="text-sm text-[var(--text-primary)]">
            <BookingDetailContent b={detailBooking} />
          </div>
        ) : null}
      </ModalShell>
    </div>
  );
}
