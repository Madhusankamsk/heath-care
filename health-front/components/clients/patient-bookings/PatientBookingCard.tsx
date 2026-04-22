"use client";

import { Button } from "@/components/ui/Button";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { DiagnosticWorkflowPanel } from "@/components/clients/patient-bookings/DiagnosticWorkflowPanel";
import type {
  DiagnosticTabId,
  InventoryBatchRow,
  IssuedMedicineSampleRow,
  LabSampleTypeLookup,
  QueuedMedicineRow,
  SampleForm,
} from "@/components/clients/patient-bookings/types";
import { arrivedDispatchForBooking, inTransitDispatchForBooking, preferredDispatchForInventory } from "@/components/clients/patient-bookings/utils";

type Props = {
  b: UpcomingBookingRow;
  canUpdateDispatch: boolean;
  canSaveVisitDraft: boolean;
  busyDispatchId: string | null;
  detailBookingId: string | null;
  onToggleDetail: (bookingId: string) => void;
  onSetPendingArrived: (dispatchId: string) => void;
  onSetPendingComplete: (dispatchId: string) => void;
  activeDiagnosticTab: DiagnosticTabId;
  setActiveDiagnosticTab: (tab: DiagnosticTabId) => void;
  diagnosisRemark: string;
  setDiagnosisRemark: (value: string) => void;
  saveVisitDraftDisabled: boolean;
  savingBookingId: string | null;
  onSaveVisitDraft: () => void;
  uploadingReportBookingId: string | null;
  onUploadReports: (files: FileList | null) => void;
  sampleForm: SampleForm;
  setSampleForm: (next: SampleForm) => void;
  addingSampleBookingId: string | null;
  onSubmitLabSample: () => void;
  removingSampleId: string | null;
  onRemoveLabSample: (sampleId: string) => void;
  labSampleTypeLookups: LabSampleTypeLookup[];
  issuedMedicineSamples: IssuedMedicineSampleRow[];
  inventoryFeatureEnabled: boolean;
  inventoryError: string | null;
  inventoryBatches: InventoryBatchRow[] | null;
  onEnsureInventoryLoaded: () => void;
  teamLeaderOptions: InventoryBatchRow[];
  selectedBatchId: string;
  onSelectBatch: (batchId: string) => void;
  qtyText: string;
  onChangeQty: (qty: string) => void;
  issuingBookingId: string | null;
  onIssueMedicine: () => void;
  queuedMedicines: QueuedMedicineRow[];
  onRemoveQueuedMedicine: (queuedId: string) => void;
  /** When set, OPD walk-in completions use POST /api/opd/:queueId/complete instead of dispatch complete. */
  onCompleteOpdConsultation?: (queueId: string) => void;
  opdCompleting?: boolean;
  /** In-house nursing discharge (POST /api/in-house/bookings/:id/complete). */
  onCompleteInHouseStay?: (bookingId: string) => void;
  canDischargeInHouse?: boolean;
  inHouseCompleting?: boolean;
};

export function PatientBookingCard(props: Props) {
  const {
    b,
    canUpdateDispatch,
    canSaveVisitDraft,
    busyDispatchId,
    detailBookingId,
    onToggleDetail,
    onSetPendingArrived,
    onSetPendingComplete,
    activeDiagnosticTab,
    setActiveDiagnosticTab,
    diagnosisRemark,
    setDiagnosisRemark,
    saveVisitDraftDisabled,
    savingBookingId,
    onSaveVisitDraft,
    uploadingReportBookingId,
    onUploadReports,
    sampleForm,
    setSampleForm,
    addingSampleBookingId,
    onSubmitLabSample,
    removingSampleId,
    onRemoveLabSample,
    labSampleTypeLookups,
    issuedMedicineSamples,
    inventoryFeatureEnabled,
    inventoryError,
    inventoryBatches,
    onEnsureInventoryLoaded,
    teamLeaderOptions,
    selectedBatchId,
    onSelectBatch,
    qtyText,
    onChangeQty,
    issuingBookingId,
    onIssueMedicine,
    queuedMedicines,
    onRemoveQueuedMedicine,
    onCompleteOpdConsultation,
    opdCompleting = false,
    onCompleteInHouseStay,
    canDischargeInHouse = false,
    inHouseCompleting = false,
  } = props;

  const inTransit = inTransitDispatchForBooking(b);
  const arrived = arrivedDispatchForBooking(b);
  const sourceDispatch = preferredDispatchForInventory(b);
  const lead = sourceDispatch?.assignments.find((a) => a.isTeamLeader)?.user ?? null;
  const bookingTypeKey = b.bookingTypeLookup?.lookupKey ?? "VISIT";
  const isOpdBooking = bookingTypeKey === "OPD";
  const isInHouseBooking = bookingTypeKey === "IN_HOUSE_NURSING";
  const bookingTypeLabel =
    b.bookingTypeLookup?.lookupValue ??
    (bookingTypeKey === "OPD" ? "OPD" : bookingTypeKey === "IN_HOUSE_NURSING" ? "In-house" : "Visit");

  return (
    <article className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">{formatScheduled(b.scheduledDate)}</p>
            <span
              className={
                isOpdBooking ? "pill pill-info" : isInHouseBooking ? "pill pill-warning" : "pill pill-success"
              }
            >
              {bookingTypeLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {b.bookingRemark?.trim() ? b.bookingRemark.trim() : "No booking remark"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {canUpdateDispatch && inTransit && !isInHouseBooking ? (
            <Button
              type="button"
              variant="secondary"
              className="shrink-0"
              disabled={busyDispatchId !== null}
              onClick={() => onSetPendingArrived(inTransit.id)}
            >
              {busyDispatchId === inTransit.id ? "…" : "Mark arrived"}
            </Button>
          ) : null}
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25"
            aria-label="View booking details"
            aria-haspopup="dialog"
            aria-expanded={detailBookingId === b.id}
            onClick={() => onToggleDetail(b.id)}
          >
            <span aria-hidden className="block translate-y-[-1px]">
              ⋮
            </span>
          </button>
        </div>
      </div>

      <DiagnosticWorkflowPanel
        b={b}
        canUpdateDispatch={canUpdateDispatch}
        canSaveVisitDraft={canSaveVisitDraft}
        busyDispatchId={busyDispatchId}
        opdCompleting={opdCompleting}
        canDischargeInHouse={canDischargeInHouse}
        inHouseCompleting={inHouseCompleting}
        activeDiagnosticTab={activeDiagnosticTab}
        setActiveDiagnosticTab={setActiveDiagnosticTab}
        diagnosisRemark={diagnosisRemark}
        setDiagnosisRemark={setDiagnosisRemark}
        saveVisitDraftDisabled={saveVisitDraftDisabled}
        savingBookingId={savingBookingId}
        onSaveVisitDraft={onSaveVisitDraft}
        uploadingReportBookingId={uploadingReportBookingId}
        onUploadReports={onUploadReports}
        sampleForm={sampleForm}
        setSampleForm={setSampleForm}
        addingSampleBookingId={addingSampleBookingId}
        onSubmitLabSample={onSubmitLabSample}
        removingSampleId={removingSampleId}
        onRemoveLabSample={onRemoveLabSample}
        labSampleTypeLookups={labSampleTypeLookups}
        issuedMedicineSamples={issuedMedicineSamples}
        inventoryFeatureEnabled={inventoryFeatureEnabled}
        inventoryError={inventoryError}
        inventoryBatches={inventoryBatches}
        onEnsureInventoryLoaded={onEnsureInventoryLoaded}
        teamLeaderName={
          isInHouseBooking && b.inHouseDetail?.assignedDoctor?.fullName?.trim()
            ? b.inHouseDetail.assignedDoctor.fullName.trim()
            : (lead?.fullName ?? "Not assigned")
        }
        teamLeaderOptions={teamLeaderOptions}
        selectedBatchId={selectedBatchId}
        onSelectBatch={onSelectBatch}
        qtyText={qtyText}
        onChangeQty={onChangeQty}
        issuingBookingId={issuingBookingId}
        onIssueMedicine={onIssueMedicine}
        queuedMedicines={queuedMedicines}
        onRemoveQueuedMedicine={onRemoveQueuedMedicine}
        onConfirmComplete={() => {
          if (isOpdBooking && b.opdQueueEntry?.id && onCompleteOpdConsultation) {
            onCompleteOpdConsultation(b.opdQueueEntry.id);
            return;
          }
          if (isInHouseBooking && onCompleteInHouseStay) {
            onCompleteInHouseStay(b.id);
            return;
          }
          if (arrived) onSetPendingComplete(arrived.id);
        }}
      />
    </article>
  );
}
