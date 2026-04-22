"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { SelectBase } from "@/components/ui/select-base";
import { TextareaBase } from "@/components/ui/textarea-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { useTableListSearch } from "@/lib/useTableListSearch";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import {
  SearchablePatientSelect,
  type SearchablePatientOption,
} from "@/components/forms/SearchablePatientSelect";

export type Booking = {
  id: string;
  patientId: string;
  scheduledDate: string | null;
  bookingRemark?: string | null;
  requestedDoctorId?: string | null;
  doctorStatusId?: string | null;
  patient?: { id: string; fullName: string } | null;
  requestedDoctor?: { id: string; fullName: string; email: string } | null;
  doctorStatusLookup?: { id: string; lookupKey: string; lookupValue: string } | null;
  bookingTypeLookup?: { id: string; lookupKey: string; lookupValue: string } | null;
};

export type DoctorProfileOption = { id: string; fullName: string; email: string };
export type DoctorStatusOption = { id: string; lookupKey: string; lookupValue: string };
export type BookingTypeOption = { id: string; lookupKey: string; lookupValue: string };

type BookingManagerProps = {
  initialBookings: Booking[];
  total: number;
  initialPage: number;
  pageSize?: number;
  doctors: DoctorProfileOption[];
  doctorStatuses: DoctorStatusOption[];
  bookingTypes: BookingTypeOption[];
  currentUserId: string;
  scopeAll: boolean;
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  initialQuery?: string;
  initialType?: string;
};

type Mode = "none" | "create" | "edit" | "preview";

type ActionConfirm = null | { type: "edit" | "delete"; id: string };

export function BookingManager({
  initialBookings,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  doctors,
  doctorStatuses,
  bookingTypes,
  currentUserId,
  scopeAll,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
  initialQuery = "",
  initialType = "",
}: BookingManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery);
  const [bookingType, setBookingType] = useState<string>(initialType);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return bookings.find((b) => b.id === selectedId) ?? null;
  }, [bookings, selectedId]);
  const normalizedBookingType = useMemo(() => {
    if (!bookingType) return "";
    const hasMatch = bookingTypes.some((option) => option.lookupKey === bookingType);
    return hasMatch ? bookingType : "";
  }, [bookingType, bookingTypes]);

  const useFullEdit = scopeAll;

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) ||
      (mode === "edit" && canEdit) ||
      (mode === "preview" && canPreview),
  );

  useEffect(() => {
    setBookings(initialBookings);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialBookings, initialTotal, initialPage]);
  useEffect(() => {
    setBookingType(initialType);
  }, [initialType]);

  async function loadPage(nextPage: number) {
    const res = await fetch(
      `/api/bookings?${pageQueryString(nextPage, pageSize, searchInput, {
        type: normalizedBookingType || undefined,
      })}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error("Failed to refresh bookings");
    const data = (await res.json()) as PaginatedResult<Booking>;
    setBookings(data.items);
    setTotal(data.total);
    setPage(data.page);
  }

  async function goToPage(next: number) {
    try {
      await loadPage(next);
    } catch {
      toast.error("Failed to load page");
    }
  }

  async function refresh() {
    const res = await fetch(
      `/api/bookings?${pageQueryString(page, pageSize, searchInput, {
        type: normalizedBookingType || undefined,
      })}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error("Failed to refresh bookings");
    const data = (await res.json()) as PaginatedResult<Booking>;
    setBookings(data.items);
    setTotal(data.total);
    setPage(data.page);
    if (data.items.length === 0 && data.page > 1) {
      await loadPage(data.page - 1);
    }
  }

  async function performDelete(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to delete booking");
      }
      await refresh();
      toast.success("Booking deleted");
      if (selectedId === id) {
        setSelectedId(null);
        setMode("none");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function setDoctorDecision(bookingId: string, lookupKey: "ACCEPTED" | "REJECTED") {
    const row = doctorStatuses.find((d) => d.lookupKey === lookupKey);
    if (!row) {
      toast.error("Status lookup not configured");
      return;
    }
    setBusyId(bookingId);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorStatusId: row.id }),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Update failed");
      }
      await refresh();
      toast.success(lookupKey === "ACCEPTED" ? "Booking accepted" : "Booking rejected");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  function onBookingTypeChange(nextType: string) {
    setBookingType(nextType);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (!nextType) params.delete("type");
    else params.set("type", nextType);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmModal
        open={actionConfirm !== null}
        title={
          actionConfirm?.type === "delete" ? "Delete booking?" : "Edit booking?"
        }
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this booking? This action cannot be undone."
            : "Are you sure you want to edit this booking?"
        }
        confirmLabel={actionConfirm?.type === "delete" ? "Delete" : "Continue"}
        confirmVariant={actionConfirm?.type === "delete" ? "delete" : "edit"}
        onCancel={() => setActionConfirm(null)}
        onConfirm={() => {
          if (!actionConfirm) return;
          const { type, id } = actionConfirm;
          setActionConfirm(null);
          if (type === "delete") {
            void performDelete(id);
          } else {
            setSelectedId(id);
            setMode("edit");
            setError(null);
          }
        }}
      />
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <CrudToolbar
        title="Manage bookings"
        note="Actions are controlled by permissions."
        description="Manage bookings: requested doctor, doctor acceptance status, and booking remark."
      >
          {canCreate ? (
            <Button
              variant="create"
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
                toast.success("Bookings refreshed");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Something went wrong";
                setError(msg);
                toast.error(msg);
              }
            }}
          >
            Refresh
          </Button>
      </CrudToolbar>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TableSearchBar
          id="bookings-table-search"
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Patient, remark, booking id…"
        />
        <label
          htmlFor="bookings-type-filter"
          className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
        >
          Booking type
          <SelectBase
            id="bookings-type-filter"
            className="h-9 min-w-44 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] shadow-xs outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            value={normalizedBookingType}
            onChange={(event) => onBookingTypeChange(event.target.value)}
          >
            <option value="">All booking types</option>
            {bookingTypes.map((option) => (
              <option key={option.id} value={option.lookupKey}>
                {option.lookupValue || option.lookupKey}
              </option>
            ))}
          </SelectBase>
        </label>
      </div>

      {mode === "create" && canCreate ? (
        <ModalShell
          open
          titleId="create-booking-title"
          title="Create booking"
          subtitle="Use the patient and doctor fields to search inside each dropdown, then add schedule and remark as needed."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <BookingForm
                layout="modal"
                intent="create"
                title="Create booking"
                submitLabel="Create"
                doctors={doctors}
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
                  toast.success("Booking created");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          titleId="edit-booking-title"
          title={useFullEdit ? "Edit booking" : "Update response"}
          subtitle={
            useFullEdit
              ? "Update patient, schedule, doctor, and acceptance."
              : "Accept or reject the request, or adjust the booking remark."
          }
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          {useFullEdit ? (
                <BookingForm
                  layout="modal"
                  intent="edit"
                  title="Edit booking"
                  submitLabel="Save changes"
                  doctors={doctors}
                  doctorStatuses={doctorStatuses}
                  initialPatient={
                    selected.patient
                      ? {
                          id: selected.patientId,
                          fullName: selected.patient.fullName,
                          shortName: null,
                          nicOrPassport: null,
                          contactNo: null,
                          whatsappNo: null,
                        }
                      : null
                  }
                  initial={{
                    patientId: selected.patientId,
                    scheduledDate: toDateTimeLocalInput(selected.scheduledDate),
                    bookingRemark: selected.bookingRemark ?? "",
                    requestedDoctorId: selected.requestedDoctorId ?? "",
                    doctorStatusId: selected.doctorStatusId ?? "",
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
                    toast.success("Booking updated");
                  }}
                />
              ) : (
                <DoctorScopedEditForm
                  layout="modal"
                  doctorStatuses={doctorStatuses}
                  initial={{
                    bookingRemark: selected.bookingRemark ?? "",
                    doctorStatusId: selected.doctorStatusId ?? "",
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
                    toast.success("Booking updated");
                  }}
                />
              )}
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          open
          titleId="preview-booking-title"
          title="Preview booking"
          subtitle="Read-only details."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div className="preview-shell sm:grid-cols-2">
                <section className="preview-section">
                  <h3 className="preview-section-title">References</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Patient</dt>
                      <dd className="preview-value">{selected.patient?.fullName ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Requested doctor</dt>
                      <dd className="preview-value">{selected.requestedDoctor?.fullName ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Doctor status</dt>
                      <dd className="preview-value">
                        {selected.doctorStatusLookup?.lookupValue ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Schedule & Remark</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Date & Time</dt>
                      <dd className="preview-value">{formatDateTime(selected.scheduledDate)}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Booking remark</dt>
                      <dd className="preview-value">{selected.bookingRemark ?? "—"}</dd>
                    </div>
                  </dl>
                </section>
              </div>
        </ModalShell>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Dr. status</TableHead>
              <TableHead>Booking type</TableHead>
              <TableHead>Booking remark</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => {
              const isBusy = busyId === booking.id;
              const showPendingActions =
                canEdit &&
                booking.requestedDoctorId === currentUserId &&
                booking.doctorStatusLookup?.lookupKey === "PENDING";
              return (
                <TableRow key={booking.id} >
                  <TableCell className="font-medium">{booking.patient?.fullName ?? "—"}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {formatDateTime(booking.scheduledDate)}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {booking.requestedDoctor?.fullName ?? "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {booking.doctorStatusLookup?.lookupValue ?? "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {formatBookingType(booking.bookingTypeLookup)}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{booking.bookingRemark ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {showPendingActions ? (
                        <>
                          <Button
                            type="button"
                            variant="create"
                            className="h-9 px-3"
                            disabled={isBusy}
                            onClick={() => void setDoctorDecision(booking.id, "ACCEPTED")}
                          >
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-9 px-3"
                            disabled={isBusy}
                            onClick={() => void setDoctorDecision(booking.id, "REJECTED")}
                          >
                            Reject
                          </Button>
                        </>
                      ) : null}
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="preview"
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
                          variant="edit"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() =>
                            setActionConfirm({ type: "edit", id: booking.id })
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="delete"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() =>
                            setActionConfirm({ type: "delete", id: booking.id })
                          }
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />
    </div>
  );
}

function doctorMatchesQuery(d: DoctorProfileOption, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${d.fullName} ${d.email}`.toLowerCase().includes(s);
}

const searchDropdownTriggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm text-[var(--text-primary)] outline-none transition hover:border-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

const searchDropdownPanelClass =
  "absolute left-0 right-0 z-[80] mt-1 max-h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg";

function SearchableDoctorSelect({
  label,
  doctors,
  value,
  onChange,
  disabled,
}: {
  label: string;
  doctors: DoctorProfileOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => doctors.filter((d) => doctorMatchesQuery(d, q)), [doctors, q]);
  const selected = value ? doctors.find((d) => d.id === value) : null;

  useEffect(() => {
    if (!open) return;
    function handleDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleDoc);
    return () => document.removeEventListener("mousedown", handleDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setQ(""), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  return (
    <div className="relative flex flex-col gap-2 text-sm" ref={rootRef}>
      <span className="font-medium text-[var(--text-primary)]">{label}</span>
      <button
        type="button"
        disabled={disabled}
        className={searchDropdownTriggerClass + (disabled ? " cursor-not-allowed opacity-60" : "")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate">
          {selected ? `${selected.fullName} (${selected.email})` : "None (optional)"}
        </span>
        <span className="text-[var(--text-muted)]" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className={searchDropdownPanelClass}>
          <input
            type="search"
            autoComplete="off"
            placeholder="Search…"
            className="w-full border-b border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
            <li role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === ""}
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                None
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
                No matches
              </li>
            ) : (
              filtered.map((d) => (
                <li key={d.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === d.id}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      onChange(d.id);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-[var(--text-primary)]">{d.fullName}</span>
                    <span className="text-xs text-[var(--text-muted)]">{d.email}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type BookingFormValues = {
  patientId: string;
  scheduledDate: string;
  bookingRemark?: string;
  requestedDoctorId?: string;
  doctorStatusId?: string;
};

function BookingForm({
  title,
  submitLabel,
  intent,
  doctors,
  doctorStatuses,
  onCancel,
  onSubmit,
  initial,
  initialPatient,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  intent: "create" | "edit";
  doctors: DoctorProfileOption[];
  doctorStatuses?: DoctorStatusOption[];
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  initial?: Partial<BookingFormValues>;
  initialPatient?: SearchablePatientOption | null;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<BookingFormValues>({
    patientId: initial?.patientId ?? "",
    scheduledDate: initial?.scheduledDate ?? "",
    bookingRemark: initial?.bookingRemark ?? "",
    requestedDoctorId: initial?.requestedDoctorId ?? "",
    doctorStatusId: initial?.doctorStatusId ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  function buildPayload(): Record<string, unknown> {
    const base = {
      patientId: values.patientId,
      scheduledDate: values.scheduledDate.trim() ? values.scheduledDate : null,
      bookingRemark: values.bookingRemark?.trim() ? values.bookingRemark.trim() : null,
      requestedDoctorId: (values.requestedDoctorId ?? "").trim()
        ? (values.requestedDoctorId ?? "").trim()
        : null,
    };
    if (intent === "edit" && doctorStatuses?.length) {
      const ds = (values.doctorStatusId ?? "").trim();
      return {
        ...base,
        doctorStatusId: ds ? ds : null,
      };
    }
    return base;
  }

  const formBody = (
    <>
      {layout === "card" ? (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            await onSubmit(buildPayload());
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Something went wrong";
            setError(msg);
            toast.error(msg);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className="sm:col-span-1">
          <SearchablePatientSelect
            label="Patient"
            value={values.patientId}
            onChange={(patientId) => setValues((v) => ({ ...v, patientId }))}
            initialPatient={initialPatient ?? null}
            required
            disabled={isSubmitting}
          />
        </div>

        <div className="sm:col-span-1">
          <SearchableDoctorSelect
            label="Requested doctor (optional)"
            doctors={doctors}
            value={values.requestedDoctorId ?? ""}
            onChange={(requestedDoctorId) => setValues((v) => ({ ...v, requestedDoctorId }))}
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Scheduled date & time (optional)"
          name="scheduledDate"
          type="datetime-local"
          value={values.scheduledDate}
          onChange={(e) => setValues((v) => ({ ...v, scheduledDate: e.target.value }))}
        />

        {intent === "edit" && doctorStatuses?.length ? (
          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--text-primary)]">Doctor acceptance</span>
            <SelectBase
              className={selectClass}
              value={values.doctorStatusId}
              onChange={(e) => setValues((v) => ({ ...v, doctorStatusId: e.target.value }))}
            >
              <option value="">—</option>
              {doctorStatuses.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.lookupValue}
                </option>
              ))}
            </SelectBase>
          </label>
        ) : null}

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Booking remark</span>
          <TextareaBase
            className={`${selectClass} min-h-[88px] py-2`}
            value={values.bookingRemark}
            onChange={(e) => setValues((v) => ({ ...v, bookingRemark: e.target.value }))}
            rows={3}
          />
        </label>

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={intent === "create" ? "create" : "edit"}
            isLoading={isSubmitting}
          >
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

function DoctorScopedEditForm({
  initial,
  doctorStatuses,
  onCancel,
  onSubmit,
  layout = "card",
}: {
  initial: { bookingRemark: string; doctorStatusId: string };
  doctorStatuses: DoctorStatusOption[];
  onCancel: () => void;
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  const formBody = (
    <>
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
              doctorStatusId: (values.doctorStatusId ?? "").trim()
                ? (values.doctorStatusId ?? "").trim()
                : null,
              bookingRemark: values.bookingRemark?.trim() ? values.bookingRemark.trim() : null,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Something went wrong";
            setError(msg);
            toast.error(msg);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Doctor acceptance</span>
          <SelectBase
            className={selectClass}
            value={values.doctorStatusId}
            onChange={(e) => setValues((v) => ({ ...v, doctorStatusId: e.target.value }))}
          >
            <option value="">—</option>
            {doctorStatuses.map((d) => (
              <option key={d.id} value={d.id}>
                {d.lookupValue}
              </option>
            ))}
          </SelectBase>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Booking remark</span>
          <TextareaBase
            className={`${selectClass} min-h-[88px] py-2`}
            value={values.bookingRemark}
            onChange={(e) => setValues((v) => ({ ...v, bookingRemark: e.target.value }))}
            rows={3}
          />
        </label>

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="edit" isLoading={isSubmitting}>
            Save
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

function formatDateTime(value: string | null) {
  if (value === null || value === "") return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatBookingType(
  bookingTypeLookup: { lookupKey: string; lookupValue: string } | null | undefined,
) {
  if (!bookingTypeLookup) return "—";
  if (bookingTypeLookup.lookupValue?.trim()) return bookingTypeLookup.lookupValue;
  if (bookingTypeLookup.lookupKey === "OPD") return "OPD";
  if (bookingTypeLookup.lookupKey === "VISIT") return "Visit";
  return bookingTypeLookup.lookupKey;
}

function toDateTimeLocalInput(value: string | null) {
  if (value === null || value === "") return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}
