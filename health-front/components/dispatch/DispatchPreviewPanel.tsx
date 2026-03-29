"use client";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";

import {
  formatCrewMemberName,
  formatScheduled,
  teamNameForVehicle,
} from "./dispatchDisplay";
import type { UpcomingBookingRow } from "./types";

type DispatchPreviewPanelProps = {
  dispatchTarget: UpcomingBookingRow;
  teams: MedicalTeam[] | null;
};

/** Read-only booking + dispatch body (same preview-shell / preview-section layout as Preview patient). */
export function DispatchPreviewPanel({ dispatchTarget, teams }: DispatchPreviewPanelProps) {
  const latest = dispatchTarget.dispatchRecords[0];
  const lead = latest?.assignments.find((a) => a.isTeamLeader);
  const others = latest?.assignments.filter((a) => !a.isTeamLeader) ?? [];
  const teamLabel =
    latest && teams?.length && latest.vehicle?.id
      ? teamNameForVehicle(teams, latest.vehicle.id)
      : null;

  return (
    <div className="text-sm text-[var(--text-primary)]">
      <div className="preview-shell sm:grid-cols-2">
        <section className="preview-section sm:col-span-2">
          <h3 className="preview-section-title">Booking</h3>
          <dl className="preview-list">
            <div className="preview-row">
              <dt className="preview-label">Scheduled</dt>
              <dd className="preview-value">{formatScheduled(dispatchTarget.scheduledDate)}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Doctor</dt>
              <dd className="preview-value">{dispatchTarget.requestedDoctor?.fullName ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Remark</dt>
              <dd className="preview-value">
                {dispatchTarget.bookingRemark?.trim() ? dispatchTarget.bookingRemark : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {!latest ? (
          <section className="preview-section sm:col-span-2">
            <p className="text-[var(--text-secondary)]">
              No dispatch recorded for this booking yet.
            </p>
          </section>
        ) : (
          <>
            <section className="preview-section sm:col-span-2">
              <h3 className="preview-section-title">Active dispatch</h3>
              <dl className="preview-list">
                <div className="preview-row">
                  <dt className="preview-label">Status</dt>
                  <dd className="preview-value">
                    {latest.statusLookup?.lookupValue ?? latest.statusLookup?.lookupKey ?? "—"}
                  </dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Vehicle</dt>
                  <dd className="preview-value">
                    {latest.vehicle.vehicleNo}
                    {latest.vehicle.model?.trim() ? ` · ${latest.vehicle.model.trim()}` : ""}
                  </dd>
                </div>
                {teamLabel ? (
                  <div className="preview-row">
                    <dt className="preview-label">Medical team (by vehicle)</dt>
                    <dd className="preview-value">{teamLabel}</dd>
                  </div>
                ) : null}
                <div className="preview-row">
                  <dt className="preview-label">Dispatched at</dt>
                  <dd className="preview-value">{formatScheduled(latest.dispatchedAt)}</dd>
                </div>
              </dl>
            </section>

            <section className="preview-section sm:col-span-2">
              <h3 className="preview-section-title">Crew</h3>
              {latest.assignments.length > 0 ? (
                <dl className="preview-list">
                  <div className="preview-row">
                    <dt className="preview-label align-top pt-0.5">Assigned</dt>
                    <dd className="preview-value">
                      <ul className="list-none space-y-1.5">
                        {lead ? (
                          <li>
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatCrewMemberName(lead.user)}
                            </span>
                            <span className="text-[var(--text-muted)]"> — team leader</span>
                          </li>
                        ) : null}
                        {others.map((a) => (
                          <li key={a.id} className="text-[var(--text-primary)]">
                            {formatCrewMemberName(a.user)}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-[var(--text-secondary)]">No crew listed on this dispatch.</p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
