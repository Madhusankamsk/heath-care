"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import type { UpcomingBookingRow } from "@/components/dispatch/types";

export function InHouseDoctorConsole(props: {
  currentUserId: string;
  rows: UpcomingBookingRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [pickingId, setPickingId] = useState<string | null>(null);

  async function pick(bookingId: string) {
    setPickingId(bookingId);
    try {
      const res = await fetch(`/api/in-house/bookings/${encodeURIComponent(bookingId)}/pick`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to pick case");
      toast.success("In-house case picked.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to pick");
    } finally {
      setPickingId(null);
    }
  }

  const { currentUserId, rows, total, page, pageSize } = props;

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
              <th className="px-3 py-2 font-medium">Patient</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Scheduled</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-[var(--text-secondary)]">
                  No in-house bookings in doctor queue.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const detail = row.inHouseDetail;
                const pendingUnassigned =
                  detail?.status === "PENDING" && !detail.assignedDoctor?.id;
                const pendingMine =
                  detail?.status === "PENDING" && detail.assignedDoctor?.id === currentUserId;
                const admittedMine =
                  detail?.status === "ADMITTED" && detail.assignedDoctor?.id === currentUserId;
                return (
                  <tr key={row.id} className="border-b border-[var(--border)]/80">
                    <td className="px-3 py-2">{row.patient?.fullName ?? "Patient"}</td>
                    <td className="px-3 py-2">{detail?.status ?? "PENDING"}</td>
                    <td className="px-3 py-2">
                      {row.scheduledDate
                        ? new Date(row.scheduledDate).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {pendingUnassigned ? (
                          <Button
                            type="button"
                            variant="primary"
                            className="h-8 px-3 text-xs"
                            disabled={pickingId !== null}
                            onClick={() => void pick(row.id)}
                          >
                            {pickingId === row.id ? "…" : "Pick"}
                          </Button>
                        ) : null}
                        {admittedMine && row.patient?.id ? (
                          <Link
                            href={`/dashboard/clients/patient/${row.patient.id}`}
                            className="text-sm font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline"
                          >
                            Open patient
                          </Link>
                        ) : null}
                        {pendingMine ? (
                          <span className="text-xs text-[var(--text-muted)]">
                            Picked by you. Admit from Admissions tab.
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        hrefForPage={(p) => `/dashboard/in-house/doctor?page=${p}`}
      />
    </div>
  );
}
