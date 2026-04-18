"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MemberDetachButton } from "@/components/admin/MemberDetachButton";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { DEFAULT_PAGE_SIZE, totalPages } from "@/lib/pagination";

type MemberRow = {
  id: string;
  joinedAt?: string | Date;
  patient?: {
    id: string;
    fullName: string;
    nicOrPassport?: string | null;
    contactNo?: string | null;
  } | null;
};

export function FamilyCorporateMembersTable({
  subscriptionAccountId,
  members,
  canDetach,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  subscriptionAccountId: string;
  members: MemberRow[];
  canDetach: boolean;
  pageSize?: number;
}) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return members;
    return members.filter((m) => {
      const name = (m.patient?.fullName ?? "").toLowerCase();
      const nic = (m.patient?.nicOrPassport ?? "").toLowerCase();
      const contact = (m.patient?.contactNo ?? "").toLowerCase();
      return name.includes(t) || nic.includes(t) || contact.includes(t);
    });
  }, [members, filter]);

  const total = filtered.length;
  const pages = totalPages(total, pageSize);

  useEffect(() => {
    const maxPage = totalPages(filtered.length, pageSize);
    if (page > maxPage) setPage(Math.max(1, maxPage));
  }, [filtered.length, page, pageSize]);

  const slice = useMemo(() => {
    const safePage = Math.min(Math.max(1, page), pages);
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize, pages]);

  function goToPage(next: number) {
    setPage(Math.min(Math.max(1, next), pages));
  }

  if (members.length === 0) {
    return (
      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <tbody>
            <tr className="border-t border-zinc-200 dark:border-zinc-800">
              <td className="px-4 py-4 text-[var(--text-secondary)]" colSpan={5}>
                No members assigned yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <TableSearchBar
        id="family-corporate-members-search"
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
        placeholder="Name, NIC, contact…"
      />
      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">NIC/Passport</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Joined At</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((m) => (
              <tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-3 font-medium">{m.patient?.fullName ?? "—"}</td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {m.patient?.nicOrPassport ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {m.patient?.contactNo ?? "—"}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {m.joinedAt ? new Date(m.joinedAt).toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {m.patient?.id ? (
                      <>
                        <Link
                          href={`/dashboard/clients/patient/${m.patient.id}`}
                          className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                        >
                          Full View
                        </Link>
                        {canDetach ? (
                          <MemberDetachButton
                            subscriptionAccountId={subscriptionAccountId}
                            patientId={m.patient.id}
                            patientName={m.patient.fullName}
                          />
                        ) : null}
                      </>
                    ) : (
                      <span className="text-xs text-[var(--text-secondary)]">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />
    </div>
  );
}
