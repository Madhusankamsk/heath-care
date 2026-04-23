"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

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
  encounterBookings: Array<{
    id: string;
    scheduledDate: string | null;
    bookingTypeLookup?: { lookupKey: string; lookupValue: string } | null;
    visitRecord?: { completedAt: string | null } | null;
  }>;
};

export function PatientClinicalTimeline({
  admissions,
  canAddNotes = false,
}: {
  admissions: PatientNursingAdmissionTimeline[];
  canAddNotes?: boolean;
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
      description="Admissions, daily notes, and diagnostic encounters on company premises. Full visit workflows for encounters appear under Bookings and Dispatch below."
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

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Daily notes
              </p>
              {a.dailyNotes.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">No notes yet.</p>
              ) : (
                <ul className="mt-2 space-y-3">
                  {a.dailyNotes.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatScheduled(n.recordedAt)} · {n.recordedBy.fullName}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--text-primary)]">{n.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Treatment encounters
              </p>
              {a.encounterBookings.length === 0 ? (
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  No diagnostic encounters linked yet. Start one from the nursing board.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {a.encounterBookings.map((eb) => (
                    <li
                      key={eb.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-[var(--text-primary)]">
                        {eb.bookingTypeLookup?.lookupValue ?? "Encounter"}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {eb.scheduledDate ? formatScheduled(eb.scheduledDate) : "—"}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {eb.visitRecord?.completedAt
                          ? `Completed ${formatScheduled(eb.visitRecord.completedAt)}`
                          : "In progress"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
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
