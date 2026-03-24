"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useEscapeKey } from "@/lib/useEscapeKey";

export type Booking = {
  id: string;
  patientId: string;
  teamId: string;
  scheduledDate: string;
  status: string;
  locationGps?: string | null;
  patient?: { id: string; fullName: string } | null;
  team?: { id: string; teamName?: string | null } | null;
};

type PatientOption = { id: string; fullName: string };
type TeamOption = { id: string; teamName?: string | null };

type BookingManagerProps = {
  initialBookings: Booking[];
  patients: PatientOption[];
  teams: TeamOption[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview";

export function BookingManager({
  initialBookings,
  patients,
  teams,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
}: BookingManagerProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return bookings.find((b) => b.id === selectedId) ?? null;
  }, [bookings, selectedId]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    mode === "create" && canCreate,
  );

  async function refresh() {
    const res = await fetch("/api/bookings", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh bookings");
    const next = (await res.json()) as Booking[];
    setBookings(next);
  }

  async function handleDelete(id: string) {
    setError(null);
    if (!window.confirm("Delete this booking?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to delete booking");
      }
      await refresh();
      if (selectedId === id) {
        setSelectedId(null);
        setMode("none");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage bookings (create, edit, delete, preview).
        </div>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Button
              variant="primary"
              className="h-10 px-4 text-xs sm:text-sm"
              onClick={() => {
                setMode("create");
                setSelectedId(null);
                setError(null);
              }}
            >
              Create booking
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
              }
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {mode === "create" && canCreate ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-booking-title"
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="create-booking-title"
                    className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                  >
                    Create booking
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Choose patient, medical team, schedule, status, and optional GPS.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    setMode("none");
                    setError(null);
                  }}
                >
                  ×
                </button>
              </div>
              <BookingForm
                layout="modal"
                title="Create booking"
                submitLabel="Create"
                patients={patients}
                teams={teams}
                onCancel={() => {
                  setMode("none");
                  setError(null);
                }}
                onSubmit={async (values) => {
                  setError(null);
                  const res = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                  });
                  if (!res.ok) {
                    const msg = await res.text().catch(() => "");
                    throw new Error(msg || "Create failed");
                  }
                  await refresh();
                  setMode("none");
                }}
              />
            </Card>
          </div>
        </div>
      ) : null}

      {mode === "edit" && selected ? (
        <BookingForm
          layout="card"
          title="Edit booking"
          submitLabel="Save changes"
          patients={patients}
          teams={teams}
          initial={{
            patientId: selected.patientId,
            teamId: selected.teamId,
            scheduledDate: toDateTimeLocalInput(selected.scheduledDate),
            status: selected.status,
            locationGps: selected.locationGps ?? "",
          }}
          onCancel={() => setMode("none")}
          onSubmit={async (values) => {
            setError(null);
            const res = await fetch(`/api/bookings/${selected.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            });
            if (!res.ok) {
              const msg = await res.text().catch(() => "");
              throw new Error(msg || "Update failed");
            }
            await refresh();
            setMode("none");
          }}
        />
      ) : null}

      {mode === "preview" && selected ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4">
            <div className="text-lg font-semibold">Preview booking</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Read-only details.</div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Patient</dt>
              <dd className="font-medium">{selected.patient?.fullName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Medical Team</dt>
              <dd className="font-medium">{selected.team?.teamName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Date & Time</dt>
              <dd className="font-medium">{formatDateTime(selected.scheduledDate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Status</dt>
              <dd className="font-medium">{selected.status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Location GPS</dt>
              <dd className="font-medium">{selected.locationGps ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setMode("none")}>
              Close
            </Button>
          </div>
        </div>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Medical Team</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const isBusy = busyId === booking.id;
              return (
                <tr key={booking.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{booking.patient?.fullName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {booking.team?.teamName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {formatDateTime(booking.scheduledDate)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{booking.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(booking.id);
                            setMode("preview");
                            setError(null);
                          }}
                        >
                          Preview
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(booking.id);
                            setMode("edit");
                            setError(null);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => handleDelete(booking.id)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type BookingFormValues = {
  patientId: string;
  teamId: string;
  scheduledDate: string;
  status: string;
  locationGps?: string;
};

function BookingForm({
  title,
  submitLabel,
  patients,
  teams,
  onCancel,
  onSubmit,
  initial,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  patients: PatientOption[];
  teams: TeamOption[];
  onCancel: () => void;
  onSubmit: (values: BookingFormValues) => Promise<void>;
  initial?: Partial<BookingFormValues>;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<BookingFormValues>({
    patientId: initial?.patientId ?? patients[0]?.id ?? "",
    teamId: initial?.teamId ?? teams[0]?.id ?? "",
    scheduledDate: initial?.scheduledDate ?? "",
    status: initial?.status ?? "Pending",
    locationGps: initial?.locationGps ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  const formBody = (
    <>
      {layout === "card" ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          try {
            await onSubmit({
              patientId: values.patientId,
              teamId: values.teamId,
              scheduledDate: values.scheduledDate,
              status: values.status,
              locationGps: values.locationGps?.trim() || undefined,
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Patient</span>
          <select
            className={selectClass}
            value={values.patientId}
            onChange={(e) => setValues((v) => ({ ...v, patientId: e.target.value }))}
            required
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Medical Team</span>
          <select
            className={selectClass}
            value={values.teamId}
            onChange={(e) => setValues((v) => ({ ...v, teamId: e.target.value }))}
            required
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.teamName ?? "Unnamed team"}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Scheduled Date & Time"
          name="scheduledDate"
          type="datetime-local"
          value={values.scheduledDate}
          onChange={(e) => setValues((v) => ({ ...v, scheduledDate: e.target.value }))}
          required
        />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Status</span>
          <select
            className={selectClass}
            value={values.status}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
          >
            {["Pending", "Confirmed", "Completed", "Cancelled"].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <Input
          label="Location GPS"
          name="locationGps"
          value={values.locationGps ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, locationGps: e.target.value }))}
          className="sm:col-span-2"
        />

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </>
  );

  if (layout === "modal") {
    return formBody;
  }

  return <div className="surface-card p-6">{formBody}</div>;
}

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function toDateTimeLocalInput(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}
