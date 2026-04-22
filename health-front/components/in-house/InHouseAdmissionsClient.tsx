"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SearchablePatientSelect } from "@/components/forms/SearchablePatientSelect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TextareaBase } from "@/components/ui/textarea-base";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { useTableListSearch } from "@/lib/useTableListSearch";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";

type Props = {
  initialRows: UpcomingBookingRow[];
  total: number;
  initialPage: number;
  pageSize?: number;
  canAdmit: boolean;
  canCreate: boolean;
  initialQuery?: string;
};

export function InHouseAdmissionsClient({
  initialRows,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  canAdmit,
  canCreate,
  initialQuery = "",
}: Props) {
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [busyAdmitId, setBusyAdmitId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [patientId, setPatientId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [bookingRemark, setBookingRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialRows, initialTotal, initialPage]);

  async function loadPage(nextPage: number) {
    const res = await fetch(
      `/api/in-house/pending-admissions?${pageQueryString(nextPage, pageSize, searchInput)}`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error("Failed to load");
    const data = (await res.json()) as PaginatedResult<UpcomingBookingRow>;
    setRows(data.items);
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

  async function admit(bookingId: string) {
    setBusyAdmitId(bookingId);
    try {
      const res = await fetch(`/api/in-house/bookings/${encodeURIComponent(bookingId)}/admit`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Admit failed");
      toast.success("Patient admitted.");
      await loadPage(page);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Admit failed");
    } finally {
      setBusyAdmitId(null);
    }
  }

  async function createBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!patientId.trim()) {
      toast.error("Select a patient.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/in-house/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId.trim(),
          scheduledDate: scheduledDate.trim() ? scheduledDate.trim() : null,
          bookingRemark: bookingRemark.trim() ? bookingRemark.trim() : null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Could not create booking");
      toast.success("In-house booking created.");
      setShowCreate(false);
      setPatientId("");
      setScheduledDate("");
      setBookingRemark("");
      await loadPage(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create booking");
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CrudToolbar
          title="Pending admissions"
          note="Create booking first, then a doctor picks it from the Doctor queue."
          description="Pending in-house bookings awaiting doctor pick and admission."
        >
          {canCreate ? (
            <Button type="button" variant="create" className="shrink-0" onClick={() => setShowCreate(true)}>
              New booking
            </Button>
          ) : null}
        </CrudToolbar>
        <TableSearchBar
          id="in-house-admissions-search"
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Patient, remark…"
        />
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Scheduled</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead className="w-[120px] text-end">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-[var(--text-muted)]">
                  No pending admissions.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const hasDoctor = Boolean(row.inHouseDetail?.assignedDoctor?.id);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">{formatScheduled(row.scheduledDate)}</TableCell>
                    <TableCell className="text-sm font-medium">
                      {row.patient?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.inHouseDetail?.assignedDoctor?.fullName ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-sm text-[var(--text-secondary)]">
                      {row.bookingRemark?.trim() || "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      {canAdmit ? (
                        <Button
                          type="button"
                          variant="primary"
                          className="h-8 px-3 text-xs"
                          disabled={busyAdmitId !== null || !hasDoctor}
                          isLoading={busyAdmitId === row.id}
                          onClick={() => void admit(row.id)}
                        >
                          {hasDoctor ? "Admit" : "Assign doctor"}
                        </Button>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />
      </Card>

      <ModalShell
        open={showCreate}
        titleId="in-house-create-booking-title"
        title="New in-house booking"
        subtitle="Create the case first; doctors pick cases from the In-House doctor queue."
        onClose={() => setShowCreate(false)}
        maxWidthClass="max-w-3xl"
      >
        <form className="flex flex-col gap-4" onSubmit={(e) => void createBooking(e)}>
          <SearchablePatientSelect
            label="Patient"
            value={patientId}
            onChange={(id) => setPatientId(id)}
            initialPatient={null}
            required
            disabled={submitting}
          />
          <Input
            label="Planned admission date & time (optional)"
            name="scheduledDate"
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            disabled={submitting}
          />
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-[var(--text-primary)]">Remark</span>
            <TextareaBase
              className={`${selectClass} min-h-[88px] py-2`}
              value={bookingRemark}
              onChange={(e) => setBookingRemark(e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="create" isLoading={submitting}>
              Create booking
            </Button>
          </div>
        </form>
      </ModalShell>

      <p className="text-xs text-[var(--text-muted)]">
        Manage doctor eligibility under{" "}
        <Link href="/dashboard/in-house/manage" className="underline">
          In-House Manage
        </Link>{" "}
        and let doctors pick cases from{" "}
        <Link href="/dashboard/in-house/doctor" className="underline">
          In-House Doctor
        </Link>
        .
      </p>
    </div>
  );
}
