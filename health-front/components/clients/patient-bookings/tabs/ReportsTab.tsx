"use client";

import type { UpcomingBookingRow } from "@/components/dispatch/types";

type Props = {
  b: UpcomingBookingRow;
  active: boolean;
  canSaveVisitDraft: boolean;
  reportBusy: boolean;
  onUploadReports: (files: FileList | null) => void;
};

export function ReportsTab({ b, active, canSaveVisitDraft, reportBusy, onUploadReports }: Props) {
  void b;
  void canSaveVisitDraft;
  void reportBusy;
  void onUploadReports;

  return (
    <div
      role="tabpanel"
      id={`patient-booking-${b.id}-panel-reports`}
      hidden={!active}
      className="px-3 py-3"
    >
      <p className="text-sm text-[var(--text-muted)]">Reports upload UI is intentionally left empty for now.</p>
    </div>
  );
}
