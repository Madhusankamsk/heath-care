"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { toast } from "@/lib/toast";

import { DispatchPreviewPanel } from "./DispatchPreviewPanel";
import {
  formatCrewMemberName,
  formatScheduled,
  teamNameForVehicle,
} from "./dispatchDisplay";
import type { UpcomingBookingRow } from "./types";

export type { UpcomingBookingRow };

type OngoingJobsTableProps = {
  initialRows: UpcomingBookingRow[];
  total: number;
  initialPage: number;
  pageSize?: number;
  teams: MedicalTeam[] | null;
  canPreview: boolean;
  canFullView: boolean;
};

export function OngoingJobsTable({
  initialRows,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  teams,
  canPreview,
  canFullView,
}: OngoingJobsTableProps) {
  const [rows, setRows] = useState<UpcomingBookingRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [previewBookingId, setPreviewBookingId] = useState<string | null>(null);

  async function loadPage(nextPage: number) {
    const res = await fetch(`/api/dispatch/ongoing?page=${nextPage}&pageSize=${pageSize}`, {
      cache: "no-store",
    });
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

  const previewTarget = useMemo(() => {
    if (!previewBookingId) return null;
    return rows.find((r) => r.id === previewBookingId) ?? null;
  }, [previewBookingId, rows]);

  const previewFullViewHref =
    previewTarget?.patient?.id != null
      ? `/dashboard/clients/patient/${previewTarget.patient.id}`
      : "/dashboard/bookings/manage-bookings";

  function closePreview() {
    setPreviewBookingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Dispatch</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No ongoing jobs. Dispatched bookings appear here while in transit or arrived on site
                  before the visit is started.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const latest = row.dispatchRecords[0];
                const statusKey = latest?.statusLookup?.lookupKey;
                const assignedTeamName =
                  latest && teams?.length
                    ? teamNameForVehicle(teams, latest.vehicle.id)
                    : null;

                return (
                  <TableRow key={row.id} >
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      {row.patient?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {formatScheduled(row.scheduledDate)}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {row.requestedDoctor?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-[var(--text-secondary)]">
                      {row.bookingRemark?.trim() ? row.bookingRemark : "—"}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {latest ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-[var(--text-primary)]">
                            {latest.statusLookup?.lookupValue ?? statusKey ?? "—"}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            {assignedTeamName ?? latest.vehicle.vehicleNo}
                            {" · "}
                            {latest.vehicle.vehicleNo}
                            {latest.assignments.length
                              ? ` · ${latest.assignments.map((a) => formatCrewMemberName(a.user)).join(", ")}`
                              : null}
                          </span>
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {canPreview ? (
                          <Button
                            type="button"
                            variant="preview"
                            className="h-9 px-3"
                            onClick={() => setPreviewBookingId(row.id)}
                          >
                            Preview
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />

      <ModalShell
        open={previewBookingId !== null}
        onClose={closePreview}
        titleId="ongoing-dispatch-preview"
        title="Preview booking"
        subtitle="Read-only details."
        maxWidthClass="max-w-4xl"
        headerTrailing={
          canFullView && previewTarget ? (
            <Link
              href={previewFullViewHref}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-none active:translate-y-px"
            >
              Full View
            </Link>
          ) : null
        }
      >
        {!previewTarget ? (
          <p className="text-sm text-[var(--text-secondary)]">Booking not found.</p>
        ) : (
          <DispatchPreviewPanel dispatchTarget={previewTarget} teams={teams} />
        )}
      </ModalShell>
    </div>
  );
}
