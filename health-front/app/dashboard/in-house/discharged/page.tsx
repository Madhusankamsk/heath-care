import Link from "next/link";
import { redirect } from "next/navigation";

import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";
import { TablePaginationBarFromSearch } from "@/components/ui/TablePaginationBarFromSearch";
import { TableSearchBarUrlSync } from "@/components/ui/TableSearchBarUrlSync";

const VIEW_PERMS = ["inhouse:list", "inhouse:read"] as const;

function formatDt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function InHouseDischargedPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const q = typeof params.q === "string" ? params.q : "";

  const bookingsResult = await backendJsonPaginated<UpcomingBookingRow>(
    `/api/in-house/discharged?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`,
  );

  const rows = bookingsResult?.items ?? [];

  return (
    <Card>
      <CrudToolbar
        title="Discharged"
        description="Completed in-house stays. Invoices appear under Payments with type In-house."
      />
      <TableSearchBarUrlSync initialQuery={q} id="in-house-discharged-search" placeholder="Patient name…" />
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Patient</TableHead>
            <TableHead>Scheduled</TableHead>
            <TableHead>Discharged</TableHead>
            <TableHead>Doctor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-sm text-[var(--text-muted)]">
                No discharged stays yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.patient?.id ? (
                    <Link
                      href={`/dashboard/clients/patient/${row.patient.id}`}
                      className="text-[var(--brand-primary)] hover:underline"
                    >
                      {row.patient.fullName}
                    </Link>
                  ) : (
                    (row.patient?.fullName ?? "—")
                  )}
                </TableCell>
                <TableCell className="text-sm">{formatScheduled(row.scheduledDate)}</TableCell>
                <TableCell className="text-sm">
                  {formatDt(row.inHouseDetail?.dischargedAt ?? row.visitRecord?.completedAt ?? null)}
                </TableCell>
                <TableCell className="text-sm">{row.inHouseDetail?.assignedDoctor?.fullName ?? "—"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {bookingsResult ? (
        <TablePaginationBarFromSearch
          page={bookingsResult.page}
          pageSize={bookingsResult.pageSize ?? DEFAULT_PAGE_SIZE}
          total={bookingsResult.total}
          pathname="/dashboard/in-house/discharged"
          q={q}
        />
      ) : null}
    </Card>
  );
}
