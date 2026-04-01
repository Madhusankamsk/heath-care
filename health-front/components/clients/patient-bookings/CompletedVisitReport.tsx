"use client";

import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type { IssuedMedicineSampleRow } from "@/components/clients/patient-bookings/types";
import { diagnosisRemarkFromVisit } from "@/components/clients/patient-bookings/utils";

type Props = {
  b: UpcomingBookingRow;
  issuedMedicineSamples: IssuedMedicineSampleRow[];
};

export function CompletedVisitReport({ b, issuedMedicineSamples }: Props) {
  const reports = b.visitRecord?.diagnosticReports ?? [];
  const samples = b.visitRecord?.labSamples ?? [];

  return (
    <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
      <div className="mb-3 border-b border-[var(--border)] pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Visit report
        </p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {b.visitRecord?.completedAt
            ? `Completed ${formatScheduled(b.visitRecord.completedAt)}`
            : "Completed"}
        </p>
      </div>

      <div className="space-y-3">
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Diagnosis remark
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
            {(() => {
              const merged = diagnosisRemarkFromVisit(b);
              return merged.trim() ? merged : "—";
            })()}
          </p>
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Reports
          </p>
          {reports.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">No reports uploaded.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {reports.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
                >
                  <span className="min-w-0 truncate text-sm text-[var(--text-primary)]">
                    {r.reportName}
                  </span>
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-[var(--brand-primary)] hover:underline"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Samples
          </p>
          {samples.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">No samples recorded.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {samples.map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <p className="font-medium text-[var(--text-primary)]">{s.sampleType}</p>
                  <p>{s.labName?.trim() ? s.labName : "—"}</p>
                  <p className="text-xs">{formatScheduled(s.collectedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Issued medicines
          </p>
          {issuedMedicineSamples.length === 0 ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">No medicines issued.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {issuedMedicineSamples.map((s) => (
                <li
                  key={s.id}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                >
                  <p className="font-medium text-[var(--text-primary)]">{s.sampleType}</p>
                  <p>{s.labName?.trim() ? s.labName : "—"}</p>
                  <p className="text-xs">{formatScheduled(s.collectedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
