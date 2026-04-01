import { formatScheduled } from "@/components/dispatch/dispatchDisplay";

import type { IssuedMedicineSampleRow } from "./shared";

export function IssuedMedicineList({
  rows,
  emptyLabel,
}: {
  rows: IssuedMedicineSampleRow[];
  emptyLabel: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        <span className="min-w-0 flex-[2] sm:flex-1">Medicine</span>
        <span className="hidden min-w-0 flex-1 sm:block">Details</span>
        <span className="hidden flex-none sm:block sm:min-w-[9rem]">Issued</span>
        <span className="min-w-0 flex-1 sm:flex-none sm:min-w-[7rem]">Status</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">{emptyLabel}</div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-[2] font-medium text-[var(--text-primary)] sm:flex-1">
                {row.sampleType}
              </span>
              <span className="hidden min-w-0 flex-1 text-[var(--text-secondary)] sm:block">
                {row.labName?.trim() ? row.labName : "—"}
              </span>
              <span className="hidden flex-none text-xs text-[var(--text-secondary)] sm:block sm:min-w-[9rem]">
                {formatScheduled(row.collectedAt)}
              </span>
              <span className="min-w-0 flex-1 text-xs text-[var(--text-secondary)] sm:flex-none sm:min-w-[7rem] sm:text-sm">
                {row.statusLabel}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
