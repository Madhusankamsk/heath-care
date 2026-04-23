"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  PatientBookingsHistory,
  type LabSampleTypeLookup,
} from "@/components/clients/PatientBookingsHistory";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ModalShell } from "@/components/ui/ModalShell";

export type PatientNursingAdmissionTimeline = {
  id: string;
  admittedAt: string;
  dischargedAt: string | null;
  siteLabel: string | null;
  statusLookup: { lookupKey: string; lookupValue: string };
  carePathwayLookup: { lookupKey: string; lookupValue: string };
  dailyNotes: Array<{
    id: string;
    recordedAt: string;
    note: string;
    recordedBy: { fullName: string };
  }>;
  encounterBookings: UpcomingBookingRow[];
};

export function PatientClinicalTimeline({
  admissions,
  canAddNotes = false,
  canUpdateDispatch = false,
  canSaveVisitDraft = false,
  labSampleTypeLookups = [],
}: {
  admissions: PatientNursingAdmissionTimeline[];
  canAddNotes?: boolean;
  canUpdateDispatch?: boolean;
  canSaveVisitDraft?: boolean;
  labSampleTypeLookups?: LabSampleTypeLookup[];
}) {
  const router = useRouter();
  const [modalAdmissionId, setModalAdmissionId] = useState<string | null>(null);
  const [noteDraftByAdmissionId, setNoteDraftByAdmissionId] = useState<Record<string, string>>({});
  const [savingAdmissionId, setSavingAdmissionId] = useState<string | null>(null);

  async function saveAdmissionNote(admissionId: string) {
    const text = (noteDraftByAdmissionId[admissionId] ?? "").trim();
    if (!text) {
      toast.error("Enter a note.");
      return;
    }

    setSavingAdmissionId(admissionId);
    try {
      const res = await fetch(`/api/nursing/admissions/${encodeURIComponent(admissionId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: text }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to save note");

      toast.success("Note saved.");
      setNoteDraftByAdmissionId((prev) => ({ ...prev, [admissionId]: "" }));
      setModalAdmissionId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to save note");
    } finally {
      setSavingAdmissionId(null);
    }
  }

  if (!admissions.length) {
    return (
      <Card
        title="In-house nursing history"
        description="Admissions, daily notes, and diagnostic encounters on company premises."
      >
        <p className="text-sm text-[var(--text-secondary)]">No in-house nursing admissions recorded.</p>
      </Card>
    );
  }

  return (
    <Card
      title="In-house nursing history"
      description="Admissions with one chronological activity timeline (daily notes + in-house nursing encounters). Nursing encounters are shown only in this section."
    >
      <div className="space-y-6">
        {admissions.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Admission</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                  {formatScheduled(a.admittedAt)}
                  {a.dischargedAt ? ` → ${formatScheduled(a.dischargedAt)}` : " → Active"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill pill-info">{a.carePathwayLookup.lookupValue}</span>
                <span className="pill pill-warning">{a.statusLookup.lookupValue}</span>
                {canAddNotes ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-8 px-3 text-xs"
                    onClick={() => setModalAdmissionId(a.id)}
                  >
                    Add note
                  </Button>
                ) : null}
              </div>
            </div>
            {a.siteLabel?.trim() ? (
              <p className="mt-3 text-sm text-[var(--text-secondary)]">
                <span className="font-medium text-[var(--text-muted)]">Site / room: </span>
                {a.siteLabel.trim()}
              </p>
            ) : null}

            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Admission activity timeline
              </p>
              {(() => {
                const noteItems = a.dailyNotes.map((n) => ({
                  id: `note-${n.id}`,
                  kind: "note" as const,
                  time: new Date(n.recordedAt).getTime(),
                  recordedAt: n.recordedAt,
                  note: n.note,
                  recordedBy: n.recordedBy.fullName,
                }));

                const encounterItems = a.encounterBookings.map((b) => {
                  const encounterTs = b.scheduledDate
                    ? new Date(b.scheduledDate).getTime()
                    : b.visitRecord?.completedAt
                      ? new Date(b.visitRecord.completedAt).getTime()
                      : 0;
                  return {
                    id: `encounter-${b.id}`,
                    kind: "encounter" as const,
                    time: Number.isFinite(encounterTs) ? encounterTs : 0,
                    booking: b,
                  };
                });

                const timeline = [...noteItems, ...encounterItems].sort((x, y) => y.time - x.time);

                if (timeline.length === 0) {
                  return (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      No activity yet. Add a daily note or start a treatment encounter.
                    </p>
                  );
                }

                return (
                  <div className="mt-2 space-y-3">
                    {timeline.map((item) =>
                      item.kind === "note" ? (
                        <div
                          key={item.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Daily note
                          </p>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            {formatScheduled(item.recordedAt)} · {item.recordedBy}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-[var(--text-primary)]">
                            {item.note}
                          </p>
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-2"
                        >
                          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Treatment encounter
                          </p>
                          <PatientBookingsHistory
                            bookings={[item.booking]}
                            canUpdateDispatch={canUpdateDispatch}
                            canSaveVisitDraft={canSaveVisitDraft}
                            labSampleTypeLookups={labSampleTypeLookups}
                          />
                        </div>
                      ),
                    )}
                  </div>
                );
              })()}
            </div>
            <ModalShell
              open={modalAdmissionId === a.id}
              onClose={() => setModalAdmissionId(null)}
              titleId={`admission-note-modal-${a.id}`}
              title="Add daily note"
              subtitle="Observations, vitals, and care details for this admission."
              maxWidthClass="max-w-lg"
            >
              <div className="flex flex-col gap-3">
                <label className="text-xs font-medium text-[var(--text-muted)]">
                  Note
                  <textarea
                    className="mt-1 min-h-[120px] w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    placeholder="Observations, vitals, care given…"
                    value={noteDraftByAdmissionId[a.id] ?? ""}
                    onChange={(e) =>
                      setNoteDraftByAdmissionId((prev) => ({ ...prev, [a.id]: e.target.value }))
                    }
                  />
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setModalAdmissionId(null)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={savingAdmissionId === a.id}
                    onClick={() => void saveAdmissionNote(a.id)}
                  >
                    {savingAdmissionId === a.id ? "Saving…" : "Save note"}
                  </Button>
                </div>
              </div>
            </ModalShell>
          </div>
        ))}
      </div>
    </Card>
  );
}
