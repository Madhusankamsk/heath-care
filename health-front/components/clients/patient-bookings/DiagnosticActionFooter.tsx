import { Button } from "@/components/ui/Button";

import type { DispatchRecordRow, PendingConfirm } from "./shared";

type Props = {
  canSaveVisitDraft: boolean;
  canUpdateDispatch: boolean;
  busyDispatchId: string | null;
  savingBookingId: string | null;
  uploadingReportBookingId: string | null;
  addingSampleBookingId: string | null;
  removingSampleId: string | null;
  bookingId: string;
  diagnosticDispatch: DispatchRecordRow | null;
  onSaveDraft: () => void;
  setPendingConfirm: (value: PendingConfirm) => void;
};

export function DiagnosticActionFooter({
  canSaveVisitDraft,
  canUpdateDispatch,
  busyDispatchId,
  savingBookingId,
  uploadingReportBookingId,
  addingSampleBookingId,
  removingSampleId,
  bookingId,
  diagnosticDispatch,
  onSaveDraft,
  setPendingConfirm,
}: Props) {
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-3">
      {canSaveVisitDraft ? (
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-4 text-xs font-medium"
          disabled={
            busyDispatchId !== null ||
            savingBookingId !== null ||
            uploadingReportBookingId !== null ||
            addingSampleBookingId !== null ||
            removingSampleId !== null
          }
          onClick={onSaveDraft}
        >
          {savingBookingId === bookingId ? "Saving…" : "Save draft"}
        </Button>
      ) : null}
      {canUpdateDispatch ? (
        <Button
          type="button"
          variant="primary"
          className="h-9 px-4 text-xs font-medium"
          disabled={busyDispatchId !== null}
          onClick={() =>
            diagnosticDispatch
              ? setPendingConfirm({ type: "complete", dispatchId: diagnosticDispatch.id })
              : undefined
          }
        >
          Complete
        </Button>
      ) : null}
    </div>
  );
}
