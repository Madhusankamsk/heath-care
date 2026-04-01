"use client";

import { Button } from "@/components/ui/Button";
import { SelectBase } from "@/components/ui/select-base";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type { LabSampleTypeLookup, SampleForm } from "@/components/clients/patient-bookings/types";

type Props = {
  b: UpcomingBookingRow;
  active: boolean;
  canSaveVisitDraft: boolean;
  busyDispatchId: string | null;
  sampleForm: SampleForm;
  setSampleForm: (next: SampleForm) => void;
  addingSampleBookingId: string | null;
  onSubmitLabSample: () => void;
  removingSampleId: string | null;
  onRemoveLabSample: (sampleId: string) => void;
  labSampleTypeLookups: LabSampleTypeLookup[];
};

export function SamplesTab({
  b,
  active,
  canSaveVisitDraft,
  busyDispatchId,
  sampleForm,
  setSampleForm,
  addingSampleBookingId,
  onSubmitLabSample,
  removingSampleId,
  onRemoveLabSample,
  labSampleTypeLookups,
}: Props) {
  const samples = b.visitRecord?.labSamples ?? [];

  return (
    <div
      role="tabpanel"
      id={`patient-booking-${b.id}-panel-samples`}
      hidden={!active}
      className="px-3 py-3"
    >
      <div className="flex flex-col gap-3">
        {canSaveVisitDraft ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Sample type *
                </span>
                <SelectBase
                  value={sampleForm.sampleTypeLookupId}
                  onChange={(e) =>
                    setSampleForm({
                      ...sampleForm,
                      sampleTypeLookupId: e.target.value,
                    })
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  disabled={labSampleTypeLookups.length === 0}
                >
                  <option value="">
                    {labSampleTypeLookups.length === 0 ? "No types — run DB seed" : "Select sample type"}
                  </option>
                  {labSampleTypeLookups.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.lookupValue}
                    </option>
                  ))}
                </SelectBase>
              </label>
              <label className="flex flex-col gap-1 text-xs">
                <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Description
                </span>
                <input
                  type="text"
                  required
                  value={sampleForm.labName}
                  onChange={(e) =>
                    setSampleForm({
                      ...sampleForm,
                      labName: e.target.value,
                    })
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                  placeholder="Description"
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="secondary"
                className="h-8 px-3 text-xs"
                disabled={
                  addingSampleBookingId === b.id ||
                  busyDispatchId !== null ||
                  labSampleTypeLookups.length === 0 ||
                  !sampleForm.labName.trim()
                }
                onClick={onSubmitLabSample}
              >
                {addingSampleBookingId === b.id ? "…" : "Record sample"}
              </Button>
            </div>
          </>
        ) : null}
        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div
            className={`flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] ${
              canSaveVisitDraft ? "sm:pr-2" : ""
            }`}
          >
            <span className="min-w-0 flex-[2] sm:flex-1">Type</span>
            <span className="hidden min-w-0 flex-1 sm:block">Description</span>
            <span className="hidden flex-none sm:block sm:min-w-[9rem]">Collected</span>
            <span className="min-w-0 flex-1 sm:flex-none sm:min-w-[7rem]">Status</span>
            {canSaveVisitDraft ? <span className="ml-auto w-14 shrink-0 text-right sm:ml-0"> </span> : null}
          </div>
          {samples.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
              No samples recorded yet.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {samples.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-[2] font-medium text-[var(--text-primary)] sm:flex-1">
                    {s.sampleType}
                  </span>
                  <span className="hidden min-w-0 flex-1 text-[var(--text-secondary)] sm:block">
                    {s.labName?.trim() ? s.labName : "—"}
                  </span>
                  <span className="hidden flex-none text-xs text-[var(--text-secondary)] sm:block sm:min-w-[9rem]">
                    {formatScheduled(s.collectedAt)}
                  </span>
                  <span className="min-w-0 flex-1 text-xs text-[var(--text-secondary)] sm:flex-none sm:min-w-[7rem] sm:text-sm">
                    {s.statusLookup?.lookupValue ?? s.statusLookup?.lookupKey ?? "—"}
                  </span>
                  {canSaveVisitDraft ? (
                    <span className="ml-auto w-14 shrink-0 text-right sm:ml-0">
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                        disabled={removingSampleId === s.id}
                        onClick={() => onRemoveLabSample(s.id)}
                      >
                        {removingSampleId === s.id ? "…" : "Remove"}
                      </button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
