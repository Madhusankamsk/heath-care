"use client";

import { useMemo, useState } from "react";

import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NursingAdmissionRow } from "@/components/nursing/types";

type NursingDischargedAdmissionsManagerProps = {
  admissions: NursingAdmissionRow[];
};

export function NursingDischargedAdmissionsManager({
  admissions,
}: NursingDischargedAdmissionsManagerProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 10;
  const filteredAdmissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admissions;
    return admissions.filter((row) => {
      const patient = row.patient.fullName.toLowerCase();
      const contact = (row.patient.contactNo ?? "").toLowerCase();
      const site = (row.siteLabel ?? "").toLowerCase();
      const status = (row.statusLookup?.lookupValue ?? "").toLowerCase();
      return patient.includes(q) || contact.includes(q) || site.includes(q) || status.includes(q);
    });
  }, [admissions, query]);
  const total = filteredAdmissions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filteredAdmissions.slice(start, start + pageSize);

  return (
    <div className="flex flex-col gap-6">
      <CrudToolbar
        title="Discharged"
        note="Read-only admissions history."
        description="Review completed in-house nursing admissions."
      />

      <TableSearchBar
        id="nursing-discharged-search"
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search patient, contact, site, status..."
      />

      <div className="tbl-shell overflow-x-auto">
        {pageRows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--text-secondary)]">
            No discharged or completed admissions.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Admitted At</TableHead>
                <TableHead>Discharged At</TableHead>
                <TableHead>Site / Room</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
            {pageRows.map((admission) => (
              <TableRow key={admission.id}>
                <TableCell>
                  <p className="font-medium text-[var(--text-primary)]">{admission.patient.fullName}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {admission.patient.contactNo ?? "No contact"}
                  </p>
                </TableCell>
                <TableCell className="text-[var(--text-primary)]">
                  {formatScheduled(admission.admittedAt)}
                </TableCell>
                <TableCell className="text-[var(--text-primary)]">
                  {admission.dischargedAt ? formatScheduled(admission.dischargedAt) : "—"}
                </TableCell>
                <TableCell className="text-[var(--text-primary)]">
                  {admission.siteLabel?.trim() || "—"}
                </TableCell>
                <TableCell className="text-[var(--text-primary)]">
                  {admission.statusLookup?.lookupValue ?? "Discharged"}
                </TableCell>
              </TableRow>
            ))}
            </TableBody>
          </Table>
        )}
      </div>

      <TablePaginationBar
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  );
}
