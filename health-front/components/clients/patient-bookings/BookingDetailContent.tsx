"use client";

import {
  formatCrewMemberName,
  formatScheduled,
} from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";

type DispatchRecordRow = UpcomingBookingRow["dispatchRecords"][number];

function dispatchLead(dr: DispatchRecordRow) {
  return dr.assignments.find((a) => a.isTeamLeader);
}

function dispatchOthers(dr: DispatchRecordRow) {
  return dr.assignments.filter((a) => !a.isTeamLeader);
}

/** Schedule & doctor, visit, and dispatch blocks (used in the card and in the details popup). */
export function BookingDetailContent({
  b,
  className = "",
}: {
  b: UpcomingBookingRow;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="preview-shell sm:grid-cols-2">
        <section className="preview-section">
          <h3 className="preview-section-title">Schedule &amp; doctor</h3>
          <dl className="preview-list">
            <div className="preview-row">
              <dt className="preview-label">Scheduled</dt>
              <dd className="preview-value">{formatScheduled(b.scheduledDate)}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Doctor status</dt>
              <dd className="preview-value">
                {b.doctorStatusLookup?.lookupValue ??
                  b.doctorStatusLookup?.lookupKey ??
                  "—"}
              </dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Requested doctor</dt>
              <dd className="preview-value">{b.requestedDoctor?.fullName ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="preview-section">
          <h3 className="preview-section-title">Visit</h3>
          <dl className="preview-list">
            <div className="preview-row">
              <dt className="preview-label">Visit on file</dt>
              <dd className="preview-value">
                {b.visitRecord
                  ? b.visitRecord.completedAt
                    ? `Completed ${formatScheduled(b.visitRecord.completedAt)}`
                    : "Started (not completed)"
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Dispatching
        </p>
        {b.dispatchRecords.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No dispatch recorded for this booking yet.
          </p>
        ) : (
          <ul className="mt-3 space-y-4">
            {b.dispatchRecords.map((dr) => {
              const l = dispatchLead(dr);
              const o = dispatchOthers(dr);
              return (
                <li
                  key={dr.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3"
                >
                  <dl className="grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">Status</dt>
                      <dd className="font-medium text-[var(--text-primary)]">
                        {dr.statusLookup?.lookupValue ?? dr.statusLookup?.lookupKey ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[var(--text-muted)]">Vehicle</dt>
                      <dd className="font-medium text-[var(--text-primary)]">
                        {dr.vehicle.vehicleNo}
                        {dr.vehicle.model?.trim() ? ` · ${dr.vehicle.model.trim()}` : ""}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs text-[var(--text-muted)]">Dispatched at</dt>
                      <dd>{formatScheduled(dr.dispatchedAt)}</dd>
                    </div>
                  </dl>
                  {dr.assignments.length > 0 ? (
                    <div className="mt-3 border-t border-[var(--border)] pt-3">
                      <p className="text-xs font-semibold text-[var(--text-muted)]">Crew</p>
                      <ul className="mt-2 space-y-1.5">
                        {l ? (
                          <li className="text-[var(--text-primary)]">
                            <span className="font-medium">{formatCrewMemberName(l.user)}</span>
                            <span className="text-[var(--text-muted)]"> — team leader</span>
                          </li>
                        ) : null}
                        {o.map((a) => (
                          <li key={a.id} className="text-[var(--text-secondary)]">
                            {formatCrewMemberName(a.user)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      No crew listed on this dispatch.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
