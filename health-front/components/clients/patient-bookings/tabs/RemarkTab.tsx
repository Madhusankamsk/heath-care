"use client";

import { TextareaBase } from "@/components/ui/textarea-base";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { diagnosisRemarkFromVisit } from "@/components/clients/patient-bookings/utils";

type Props = {
  b: UpcomingBookingRow;
  active: boolean;
  canSaveVisitDraft: boolean;
  diagnosisRemark: string;
  setDiagnosisRemark: (value: string) => void;
};

export function RemarkTab({
  b,
  active,
  canSaveVisitDraft,
  diagnosisRemark,
  setDiagnosisRemark,
}: Props) {
  return (
    <div
      role="tabpanel"
      id={`patient-booking-${b.id}-panel-remark`}
      hidden={!active}
      className="px-3 py-3"
    >
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Diagnosis remark
          </span>
          {canSaveVisitDraft ? (
            <TextareaBase
              rows={5}
              value={diagnosisRemark}
              onChange={(e) => setDiagnosisRemark(e.target.value)}
              placeholder="Diagnosis remark"
              className="min-h-[120px] resize-y rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
              {(() => {
                const merged = diagnosisRemarkFromVisit(b);
                return merged.trim() ? merged : "—";
              })()}
            </p>
          )}
        </label>
      </div>
    </div>
  );
}
