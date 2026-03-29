"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import {
  formatCrewMemberName,
  formatScheduled,
} from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { toast } from "@/lib/toast";

type PatientBookingsHistoryProps = {
  bookings: UpcomingBookingRow[];
  /** `dispatch:update` — Mark arrived, Start diagnostic, Complete dispatch */
  canUpdateDispatch?: boolean;
  /** `bookings:update` — Save draft (diagnosis remark); booking remark is read-only here */
  canSaveVisitDraft?: boolean;
};

type DispatchRecordRow = UpcomingBookingRow["dispatchRecords"][number];

type PendingConfirm =
  | null
  | { type: "arrived"; dispatchId: string }
  | { type: "diagnostic"; dispatchId: string }
  | { type: "complete"; dispatchId: string };

type DiagnosticTabId = "remark" | "reports" | "samples" | "medicines";

const DIAGNOSTIC_TABS: { id: DiagnosticTabId; label: string }[] = [
  { id: "remark", label: "Remark" },
  { id: "reports", label: "Reports upload" },
  { id: "samples", label: "Samples" },
  { id: "medicines", label: "Medicines" },
];

function safeFileKeySegment(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

/** Combined clinical notes + diagnosis as one "diagnosis remark" (legacy rows may have both). */
function diagnosisRemarkFromVisit(b: UpcomingBookingRow): string {
  const c = b.visitRecord?.clinicalNotes?.trim() ?? "";
  const d = b.visitRecord?.diagnosis?.trim() ?? "";
  if (!c && !d) return "";
  if (!c) return d;
  if (!d) return c;
  if (c === d) return d;
  return `${c}\n\n${d}`;
}

function dispatchLead(dr: DispatchRecordRow) {
  return dr.assignments.find((a) => a.isTeamLeader);
}

function dispatchOthers(dr: DispatchRecordRow) {
  return dr.assignments.filter((a) => !a.isTeamLeader);
}

function inTransitDispatchForBooking(b: UpcomingBookingRow): DispatchRecordRow | null {
  return b.dispatchRecords.find((dr) => dr.statusLookup?.lookupKey === "IN_TRANSIT") ?? null;
}

function arrivedDispatchForBooking(b: UpcomingBookingRow): DispatchRecordRow | null {
  return b.dispatchRecords.find((dr) => dr.statusLookup?.lookupKey === "ARRIVED") ?? null;
}

function diagnosticDispatchForBooking(b: UpcomingBookingRow): DispatchRecordRow | null {
  return b.dispatchRecords.find((dr) => dr.statusLookup?.lookupKey === "DIAGNOSTIC") ?? null;
}

/** Schedule & doctor, visit, and dispatch blocks (used in the card and in the details popup). */
function BookingDetailContent({
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

export function PatientBookingsHistory({
  bookings,
  canUpdateDispatch = false,
  canSaveVisitDraft = false,
}: PatientBookingsHistoryProps) {
  const router = useRouter();
  const [busyDispatchId, setBusyDispatchId] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  /** Active sliding tab per booking (defaults to remark). */
  const [diagnosticTabByBookingId, setDiagnosticTabByBookingId] = useState<
    Record<string, DiagnosticTabId>
  >({});
  const [diagnosisRemarkDraftByBookingId, setDiagnosisRemarkDraftByBookingId] = useState<
    Record<string, string>
  >({});
  const [sampleFormByBookingId, setSampleFormByBookingId] = useState<
    Record<string, { sampleType: string; labName: string }>
  >({});
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [uploadingReportBookingId, setUploadingReportBookingId] = useState<string | null>(null);
  const [addingSampleBookingId, setAddingSampleBookingId] = useState<string | null>(null);

  async function patchDispatchStatus(
    dispatchId: string,
    statusLookupKey: "ARRIVED" | "DIAGNOSTIC" | "COMPLETED",
  ) {
    setBusyDispatchId(dispatchId);
    try {
      const res = await fetch(`/api/dispatch/${dispatchId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusLookupKey }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Update failed");
      }
      const msg =
        statusLookupKey === "ARRIVED"
          ? "Marked as arrived."
          : statusLookupKey === "DIAGNOSTIC"
            ? "Diagnostic stage started."
            : "Visit completed.";
      toast.success(msg);
      setPendingConfirm(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyDispatchId(null);
    }
  }

  function diagnosisRemarkDraftForBooking(b: UpcomingBookingRow): string {
    if (diagnosisRemarkDraftByBookingId[b.id] !== undefined) {
      return diagnosisRemarkDraftByBookingId[b.id] ?? "";
    }
    return diagnosisRemarkFromVisit(b);
  }

  function setDiagnosisRemarkDraft(bookingId: string, value: string) {
    setDiagnosisRemarkDraftByBookingId((prev) => ({ ...prev, [bookingId]: value }));
  }

  async function saveVisitDraftForBooking(b: UpcomingBookingRow) {
    const text = diagnosisRemarkDraftForBooking(b).trim();
    setSavingBookingId(b.id);
    try {
      const res = await fetch(`/api/bookings/${b.id}/visit-draft`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicalNotes: null,
          diagnosis: text ? text : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Failed to save draft");
      toast.success("Draft saved.");
      setDiagnosisRemarkDraftByBookingId((prev) => {
        const next = { ...prev };
        delete next[b.id];
        return next;
      });
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingBookingId(null);
    }
  }

  async function uploadReportsForBooking(b: UpcomingBookingRow, files: FileList | null) {
    if (!files?.length) return;
    setUploadingReportBookingId(b.id);
    try {
      for (const file of Array.from(files)) {
        const key = `diagnostic-reports/${b.id}/${crypto.randomUUID()}-${safeFileKeySegment(file.name)}`;
        const up = await fetch("/api/files/upload", {
          method: "POST",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "x-file-key": key,
          },
          body: file,
        });
        const upData = (await up.json().catch(() => ({}))) as { url?: string; message?: string };
        if (!up.ok) throw new Error(upData.message || "Upload failed");
        const url = upData.url;
        if (!url) throw new Error("No file URL returned");

        const create = await fetch(`/api/bookings/${b.id}/diagnostic-reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportName: file.name,
            fileUrl: url,
          }),
        });
        const cData = (await create.json().catch(() => ({}))) as { message?: string };
        if (!create.ok) throw new Error(cData.message || "Could not save report");
      }
      toast.success(files.length > 1 ? "Reports uploaded." : "Report uploaded.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingReportBookingId(null);
    }
  }

  function sampleFormForBooking(b: UpcomingBookingRow): { sampleType: string; labName: string } {
    return sampleFormByBookingId[b.id] ?? { sampleType: "", labName: "" };
  }

  async function submitLabSample(b: UpcomingBookingRow) {
    const form = sampleFormForBooking(b);
    const sampleType = form.sampleType.trim();
    if (!sampleType) {
      toast.error("Enter a sample type.");
      return;
    }
    setAddingSampleBookingId(b.id);
    try {
      const res = await fetch(`/api/bookings/${b.id}/lab-samples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sampleType,
          labName: form.labName.trim() ? form.labName.trim() : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not add sample");
      toast.success("Sample recorded.");
      setSampleFormByBookingId((prev) => ({
        ...prev,
        [b.id]: { sampleType: "", labName: "" },
      }));
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setAddingSampleBookingId(null);
    }
  }

  const detailBooking = detailBookingId
    ? bookings.find((x) => x.id === detailBookingId)
    : null;

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No bookings recorded for this patient yet.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {bookings.map((b) => {
        const inTransit = inTransitDispatchForBooking(b);
        const arrived = arrivedDispatchForBooking(b);
        const diagnostic = diagnosticDispatchForBooking(b);
        const visitDone = Boolean(b.visitRecord?.completedAt);
        const inDiagnosticPhase = Boolean(diagnostic) && !visitDone;
        const activeDiagnosticTab = diagnosticTabByBookingId[b.id] ?? "remark";
        const diagnosticTabIndex = Math.max(
          0,
          DIAGNOSTIC_TABS.findIndex((t) => t.id === activeDiagnosticTab),
        );

        return (
          <article
            key={b.id}
            className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {formatScheduled(b.scheduledDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                {canUpdateDispatch && inTransit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={busyDispatchId !== null}
                    onClick={() => setPendingConfirm({ type: "arrived", dispatchId: inTransit.id })}
                  >
                    {busyDispatchId === inTransit.id ? "…" : "Mark arrived"}
                  </Button>
                ) : null}
                {canUpdateDispatch && arrived && !inTransit ? (
                  <Button
                    type="button"
                    variant="secondary"
                    className="shrink-0"
                    disabled={busyDispatchId !== null}
                    onClick={() =>
                      setPendingConfirm({ type: "diagnostic", dispatchId: arrived.id })
                    }
                  >
                    {busyDispatchId === arrived.id ? "…" : "Start diagnostic"}
                  </Button>
                ) : null}
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-lg leading-none text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25"
                  aria-label="View booking details"
                  aria-haspopup="dialog"
                  aria-expanded={detailBookingId === b.id}
                  onClick={() =>
                    setDetailBookingId((current) => (current === b.id ? null : b.id))
                  }
                >
                  <span aria-hidden className="block translate-y-[-1px]">
                    ⋮
                  </span>
                </button>
              </div>
            </div>

            {inDiagnosticPhase && (canUpdateDispatch || canSaveVisitDraft) ? (
              <>
                <div className="mt-4 flex flex-col gap-3">
                  <div
                    className="relative flex rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1"
                    role="tablist"
                    aria-label="Visit workflow"
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute bottom-1 left-1 top-1 z-0 w-[calc(25%-5px)] rounded-md bg-[var(--surface)] shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out dark:ring-white/10"
                      style={{
                        transform: `translateX(calc(${diagnosticTabIndex} * 100%))`,
                      }}
                    />
                    {DIAGNOSTIC_TABS.map((tab) => {
                      const selected = activeDiagnosticTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          role="tab"
                          id={`patient-booking-${b.id}-tab-${tab.id}`}
                          aria-controls={`patient-booking-${b.id}-panel-${tab.id}`}
                          aria-selected={selected}
                          className={`relative z-10 flex min-h-9 min-w-0 flex-1 items-center justify-center rounded-md px-1.5 text-center text-xs font-medium transition-colors ${
                            selected
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                          }`}
                          onClick={() =>
                            setDiagnosticTabByBookingId((prev) => ({
                              ...prev,
                              [b.id]: tab.id,
                            }))
                          }
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                    <div
                      role="tabpanel"
                      id={`patient-booking-${b.id}-panel-remark`}
                      hidden={activeDiagnosticTab !== "remark"}
                      className="px-3 py-3"
                    >
                        <div className="flex flex-col gap-3">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              Diagnosis remark
                            </span>
                            {canSaveVisitDraft ? (
                              <textarea
                                rows={5}
                                value={diagnosisRemarkDraftForBooking(b)}
                                onChange={(e) => setDiagnosisRemarkDraft(b.id, e.target.value)}
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
                    <div
                      role="tabpanel"
                      id={`patient-booking-${b.id}-panel-reports`}
                      hidden={activeDiagnosticTab !== "reports"}
                      className="px-3 py-3"
                    >
                        {(() => {
                          const reports = b.visitRecord?.diagnosticReports ?? [];
                          const reportBusy = uploadingReportBookingId === b.id;
                          return (
                            <div className="flex flex-col gap-3">
                              <input
                                type="file"
                                id={`patient-booking-${b.id}-report-file`}
                                className="sr-only"
                                multiple
                                disabled={!canSaveVisitDraft || reportBusy}
                                onChange={(e) => {
                                  void uploadReportsForBooking(b, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                              <div
                                role={canSaveVisitDraft && !reportBusy ? "button" : undefined}
                                tabIndex={canSaveVisitDraft && !reportBusy ? 0 : undefined}
                                onClick={() => {
                                  if (canSaveVisitDraft && !reportBusy) {
                                    document
                                      .getElementById(`patient-booking-${b.id}-report-file`)
                                      ?.click();
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (
                                    (e.key === "Enter" || e.key === " ") &&
                                    canSaveVisitDraft &&
                                    !reportBusy
                                  ) {
                                    e.preventDefault();
                                    document
                                      .getElementById(`patient-booking-${b.id}-report-file`)
                                      ?.click();
                                  }
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (canSaveVisitDraft && !reportBusy) {
                                    void uploadReportsForBooking(b, e.dataTransfer.files);
                                  }
                                }}
                                className={`flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--surface)] px-4 text-center text-sm ${
                                  canSaveVisitDraft && !reportBusy
                                    ? "cursor-pointer hover:bg-[var(--surface-2)]"
                                    : "cursor-default opacity-90"
                                }`}
                              >
                                <span className="text-2xl leading-none opacity-60" aria-hidden>
                                  ↑
                                </span>
                                <span className="font-medium text-[var(--text-secondary)]">
                                  {reportBusy ? "Uploading…" : "Upload reports"}
                                </span>
                                <span className="text-xs text-[var(--text-muted)]">
                                  {canSaveVisitDraft
                                    ? "Drag and drop or tap to browse"
                                    : "Upload requires bookings:update"}
                                </span>
                              </div>
                              {reports.length === 0 ? (
                                <p className="text-center text-xs text-[var(--text-muted)]">
                                  No reports uploaded yet.
                                </p>
                              ) : (
                                <ul className="max-h-48 space-y-2 overflow-y-auto">
                                  {reports.map((r) => (
                                    <li
                                      key={r.id}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                                    >
                                      <span className="min-w-0 truncate text-[var(--text-primary)]">
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
                            </div>
                          );
                        })()}
                    </div>
                    <div
                      role="tabpanel"
                      id={`patient-booking-${b.id}-panel-samples`}
                      hidden={activeDiagnosticTab !== "samples"}
                      className="px-3 py-3"
                    >
                        {(() => {
                          const samples = b.visitRecord?.labSamples ?? [];
                          return (
                            <div className="flex flex-col gap-3">
                              {canSaveVisitDraft ? (
                                <>
                                  <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                        Sample type *
                                      </span>
                                      <input
                                        type="text"
                                        value={sampleFormForBooking(b).sampleType}
                                        onChange={(e) =>
                                          setSampleFormByBookingId((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              sampleType: e.target.value,
                                              labName: prev[b.id]?.labName ?? "",
                                            },
                                          }))
                                        }
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                                        placeholder="e.g. Blood, Urine"
                                      />
                                    </label>
                                    <label className="flex flex-col gap-1 text-xs">
                                      <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                        Lab (optional)
                                      </span>
                                      <input
                                        type="text"
                                        value={sampleFormForBooking(b).labName}
                                        onChange={(e) =>
                                          setSampleFormByBookingId((prev) => ({
                                            ...prev,
                                            [b.id]: {
                                              sampleType: prev[b.id]?.sampleType ?? "",
                                              labName: e.target.value,
                                            },
                                          }))
                                        }
                                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
                                        placeholder="Lab name"
                                      />
                                    </label>
                                  </div>
                                  <div className="flex justify-end">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      className="h-8 px-3 text-xs"
                                      disabled={
                                        addingSampleBookingId === b.id || busyDispatchId !== null
                                      }
                                      onClick={() => void submitLabSample(b)}
                                    >
                                      {addingSampleBookingId === b.id ? "…" : "Record sample"}
                                    </Button>
                                  </div>
                                </>
                              ) : null}
                              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:grid-cols-4">
                                  <span className="sm:col-span-1">Type</span>
                                  <span className="hidden sm:block">Lab</span>
                                  <span>Collected</span>
                                  <span className="text-right">Status</span>
                                </div>
                                {samples.length === 0 ? (
                                  <div className="px-3 py-6 text-center text-sm text-[var(--text-muted)]">
                                    No samples recorded yet.
                                  </div>
                                ) : (
                                  <ul className="divide-y divide-[var(--border)]">
                                    {samples.map((s) => (
                                      <li
                                        key={s.id}
                                        className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-3 py-2 text-sm sm:grid-cols-4 sm:items-center"
                                      >
                                        <span className="font-medium text-[var(--text-primary)]">
                                          {s.sampleType}
                                        </span>
                                        <span className="hidden text-[var(--text-secondary)] sm:block">
                                          {s.labName?.trim() ? s.labName : "—"}
                                        </span>
                                        <span className="text-xs text-[var(--text-secondary)]">
                                          {formatScheduled(s.collectedAt)}
                                        </span>
                                        <span className="text-right text-xs text-[var(--text-secondary)]">
                                          {s.statusLookup?.lookupValue ??
                                            s.statusLookup?.lookupKey ??
                                            "—"}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                    </div>
                    <div
                      role="tabpanel"
                      id={`patient-booking-${b.id}-panel-medicines`}
                      hidden={activeDiagnosticTab !== "medicines"}
                      className="px-3 py-3"
                    >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                              Prescribed / dispensed
                            </span>
                            <button
                              type="button"
                              disabled
                              className="cursor-not-allowed rounded-md border border-dashed border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)]"
                            >
                              + Add
                            </button>
                          </div>
                          <ul className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
                            <li className="text-center text-sm text-[var(--text-muted)]">
                              No medicines — UI preview
                            </li>
                          </ul>
                        </div>
                    </div>
                  </div>
                </div>

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
                        addingSampleBookingId !== null
                      }
                      onClick={() => void saveVisitDraftForBooking(b)}
                    >
                      {savingBookingId === b.id ? "Saving…" : "Save draft"}
                    </Button>
                  ) : null}
                  {canUpdateDispatch ? (
                    <Button
                      type="button"
                      variant="primary"
                      className="h-9 px-4 text-xs font-medium"
                      disabled={busyDispatchId !== null}
                      onClick={() =>
                        diagnostic
                          ? setPendingConfirm({ type: "complete", dispatchId: diagnostic.id })
                          : undefined
                      }
                    >
                      Complete
                    </Button>
                  ) : null}
                </div>
              </>
            ) : null}
          </article>
        );
      })}

      <ConfirmModal
        open={pendingConfirm?.type === "arrived"}
        title="Mark crew as arrived?"
        message="Confirm the team has arrived on site for this dispatch."
        confirmLabel="Yes, mark arrived"
        cancelLabel="Cancel"
        isConfirming={
          pendingConfirm?.type === "arrived" && busyDispatchId === pendingConfirm.dispatchId
        }
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (pendingConfirm?.type === "arrived") {
            void patchDispatchStatus(pendingConfirm.dispatchId, "ARRIVED");
          }
        }}
      />

      <ConfirmModal
        open={pendingConfirm?.type === "diagnostic"}
        title="Start diagnostic stage?"
        message="This opens the clinical workflow (remarks, reports, samples, medicines, completion) for this visit."
        confirmLabel="Start diagnostic"
        cancelLabel="Cancel"
        isConfirming={
          pendingConfirm?.type === "diagnostic" && busyDispatchId === pendingConfirm.dispatchId
        }
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (pendingConfirm?.type === "diagnostic") {
            void patchDispatchStatus(pendingConfirm.dispatchId, "DIAGNOSTIC");
          }
        }}
      />

      <ConfirmModal
        open={pendingConfirm?.type === "complete"}
        title="Complete this visit?"
        message="This marks the dispatch completed and closes the visit. Make sure notes and billing steps are done."
        confirmLabel="Complete visit"
        cancelLabel="Cancel"
        isConfirming={
          pendingConfirm?.type === "complete" && busyDispatchId === pendingConfirm.dispatchId
        }
        onCancel={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (pendingConfirm?.type === "complete") {
            void patchDispatchStatus(pendingConfirm.dispatchId, "COMPLETED");
          }
        }}
      />

      <ModalShell
        open={detailBookingId !== null && detailBooking !== undefined}
        onClose={() => setDetailBookingId(null)}
        titleId="patient-booking-detail"
        title="Booking details"
        subtitle={detailBooking ? detailBooking.id : ""}
        maxWidthClass="max-w-3xl"
      >
        {detailBooking ? (
          <div className="text-sm text-[var(--text-primary)]">
            <BookingDetailContent b={detailBooking} />
          </div>
        ) : null}
      </ModalShell>
    </div>
  );
}
