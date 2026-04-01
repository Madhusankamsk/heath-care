"use client";

import { Button } from "@/components/ui/Button";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { CompletedVisitReport } from "@/components/clients/patient-bookings/CompletedVisitReport";
import { MedicinesTab } from "@/components/clients/patient-bookings/tabs/MedicinesTab";
import { ReportsTab } from "@/components/clients/patient-bookings/tabs/ReportsTab";
import { RemarkTab } from "@/components/clients/patient-bookings/tabs/RemarkTab";
import { SamplesTab } from "@/components/clients/patient-bookings/tabs/SamplesTab";
import { DIAGNOSTIC_TABS, type DiagnosticTabId, type InventoryBatchRow, type IssuedMedicineSampleRow, type LabSampleTypeLookup, type SampleForm } from "@/components/clients/patient-bookings/types";
import { arrivedDispatchForBooking } from "@/components/clients/patient-bookings/utils";

type Props = {
  b: UpcomingBookingRow;
  canUpdateDispatch: boolean;
  canSaveVisitDraft: boolean;
  busyDispatchId: string | null;
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
  teamLeaderName: string;
  teamLeaderOptions: InventoryBatchRow[];
  selectedBatchId: string;
  onSelectBatch: (batchId: string) => void;
  qtyText: string;
  onChangeQty: (qty: string) => void;
  issuingBookingId: string | null;
  onIssueMedicine: () => void;
  onConfirmComplete: () => void;
};

export function DiagnosticWorkflowPanel(props: Props) {
  const {
    b,
    canUpdateDispatch,
    canSaveVisitDraft,
    busyDispatchId,
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
    teamLeaderName,
    teamLeaderOptions,
    selectedBatchId,
    onSelectBatch,
    qtyText,
    onChangeQty,
    issuingBookingId,
    onIssueMedicine,
    onConfirmComplete,
  } = props;

  const arrived = arrivedDispatchForBooking(b);
  const visitDone = Boolean(b.visitRecord?.completedAt);
  const completedDispatch = b.dispatchRecords.some((dr) => dr.statusLookup?.lookupKey === "COMPLETED");
  const isCompleted = visitDone || completedDispatch;
  const inWorkflowPhase = Boolean(arrived) && !visitDone;
  if (!inWorkflowPhase && !isCompleted) return null;
  if (!canUpdateDispatch && !canSaveVisitDraft && !isCompleted) return null;

  const diagnosticTabIndex = Math.max(
    0,
    DIAGNOSTIC_TABS.findIndex((t) => t.id === activeDiagnosticTab),
  );
  const reports = b.visitRecord?.diagnosticReports ?? [];
  const reportBusy = uploadingReportBookingId === b.id;

  if (isCompleted) {
    return <CompletedVisitReport b={b} issuedMedicineSamples={issuedMedicineSamples} />;
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-3">
        <div
          className="relative flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
          role="tablist"
          aria-label="Visit workflow"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 w-[calc(25%-5px)] rounded-md bg-[var(--surface)] shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out dark:ring-white/10"
            style={{
              transform: `translateX(calc(${diagnosticTabIndex} * 100%))`,
            }}
          />
          {DIAGNOSTIC_TABS.map((tab) => {
            const selected = activeDiagnosticTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`patient-booking-${b.id}-tab-${tab.id}`}
                aria-controls={`patient-booking-${b.id}-panel-${tab.id}`}
                aria-selected={selected}
                className={`relative z-10 flex min-h-9 min-w-0 flex-1 items-center justify-center rounded-md px-1.5 text-center text-xs font-medium transition-colors ${
                  selected
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
                onClick={() => setActiveDiagnosticTab(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
          <RemarkTab
            b={b}
            active={activeDiagnosticTab === "remark"}
            canSaveVisitDraft={canSaveVisitDraft}
            diagnosisRemark={diagnosisRemark}
            setDiagnosisRemark={setDiagnosisRemark}
          />
          <ReportsTab
            b={b}
            active={activeDiagnosticTab === "reports"}
            canSaveVisitDraft={canSaveVisitDraft}
            reportBusy={reportBusy}
            onUploadReports={onUploadReports}
          />
          <SamplesTab
            b={b}
            active={activeDiagnosticTab === "samples"}
            canSaveVisitDraft={canSaveVisitDraft}
            busyDispatchId={busyDispatchId}
            sampleForm={sampleForm}
            setSampleForm={setSampleForm}
            addingSampleBookingId={addingSampleBookingId}
            onSubmitLabSample={onSubmitLabSample}
            removingSampleId={removingSampleId}
            onRemoveLabSample={onRemoveLabSample}
            labSampleTypeLookups={labSampleTypeLookups}
          />
          <MedicinesTab
            b={b}
            active={activeDiagnosticTab === "medicines"}
            inventoryFeatureEnabled={inventoryFeatureEnabled}
            inventoryError={inventoryError}
            inventoryBatches={inventoryBatches}
            onEnsureInventoryLoaded={onEnsureInventoryLoaded}
            teamLeaderName={teamLeaderName}
            teamLeaderOptions={teamLeaderOptions}
            selectedBatchId={selectedBatchId}
            onSelectBatch={onSelectBatch}
            qtyText={qtyText}
            onChangeQty={onChangeQty}
            issuingBookingId={issuingBookingId}
            onIssueMedicine={onIssueMedicine}
            issuedMedicineSamples={issuedMedicineSamples}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
        {canSaveVisitDraft ? (
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-4 text-xs font-medium"
            disabled={saveVisitDraftDisabled}
            onClick={onSaveVisitDraft}
          >
            {savingBookingId === b.id ? "Saving…" : "Save draft"}
          </Button>
        ) : null}
        {canUpdateDispatch ? (
          <Button
            type="button"
            variant="primary"
            className="h-9 px-4 text-xs font-medium"
            disabled={busyDispatchId !== null}
            onClick={onConfirmComplete}
          >
            Complete
          </Button>
        ) : null}
      </div>
    </>
  );
}
