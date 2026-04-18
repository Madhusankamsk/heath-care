"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { cn } from "@/lib/utils";
import { pageQueryString, type PaginatedResult } from "@/lib/pagination";
import { useTableListSearch } from "@/lib/useTableListSearch";
import { toast } from "@/lib/toast";

type SubstoreBatchLine = {
  id: string;
  batchNo: string;
  quantity: number;
  buyingPrice: number | string;
  medicine: { name: string };
};

type SubstoreRow = {
  user: { id: string; fullName: string; email: string };
  totalQuantity: number;
  batches: SubstoreBatchLine[];
};

function num(v: unknown): number {
  const n = typeof v === "string" ? Number.parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function lineValue(b: SubstoreBatchLine): number {
  return num(b.buyingPrice) * b.quantity;
}

function substoreTotalValue(batches: SubstoreBatchLine[]): number {
  return batches.reduce((sum, b) => sum + lineValue(b), 0);
}

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);
}

type BatchOption = { id: string; batchNo: string; medicine: { name: string } };
type UserOption = { id: string; fullName: string };

export function MobileSubstoreManager({
  initialRows,
  total: initialTotal,
  initialPage,
  pageSize: initialPageSize,
  users,
  batches,
  initialQuery = "",
}: {
  initialRows: SubstoreRow[];
  total: number;
  initialPage: number;
  pageSize: number;
  users: UserOption[];
  batches: BatchOption[];
  initialQuery?: string;
}) {
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery);
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const pageSize = initialPageSize;
  const [values, setValues] = useState({
    userId: users[0]?.id ?? "",
    batchId: batches[0]?.id ?? "",
    quantity: "1",
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialRows, initialTotal, initialPage]);

  const toggleExpand = useCallback((userId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const loadPage = useCallback(
    async (nextPage: number) => {
      const res = await fetch(
        `/api/inventory/mobile-substores?${pageQueryString(nextPage, pageSize, searchInput)}`,
        {
          cache: "no-store",
        },
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as PaginatedResult<SubstoreRow>;
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
    },
    [pageSize, searchInput],
  );

  async function refresh() {
    const res = await fetch(
      `/api/inventory/mobile-substores?${pageQueryString(page, pageSize, searchInput)}`,
      {
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error("Failed to refresh");
    const data = (await res.json()) as PaginatedResult<SubstoreRow>;
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
    if (data.items.length === 0 && data.page > 1) {
      await loadPage(data.page - 1);
    }
  }

  async function goToPage(nextPage: number) {
    if (nextPage < 1) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    const clamped = Math.min(nextPage, maxPage);
    try {
      await loadPage(clamped);
    } catch {
      toast.error("Failed to load page");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CrudToolbar
        title="Mobile Substores"
        description="Assign stock to mobile users. Expand a row to see items, quantities, and value at cost."
      />
      <TableSearchBar
        id="mobile-substores-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Staff name or email…"
      />
      <form
        className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 sm:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/inventory/mobile-substores/assign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: values.userId,
              batchId: values.batchId,
              quantity: Number(values.quantity),
            }),
          });
          if (!res.ok) {
            toast.error((await res.text().catch(() => "")) || "Assignment failed");
            return;
          }
          await refresh();
          toast.success("Assigned to mobile substore");
        }}
      >
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">User</span>
          <SelectBase value={values.userId} onChange={(e) => setValues((v) => ({ ...v, userId: e.target.value }))}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
          </SelectBase>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Source Batch</span>
          <SelectBase value={values.batchId} onChange={(e) => setValues((v) => ({ ...v, batchId: e.target.value }))}>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.medicine.name} - {b.batchNo}</option>)}
          </SelectBase>
        </label>
        <Input label="Quantity" name="quantity" type="number" value={values.quantity} onChange={(e) => setValues((v) => ({ ...v, quantity: e.target.value }))} required />
        <div className="flex items-end">
          <Button type="submit" variant="create" className="h-11 w-full">Assign</Button>
        </div>
      </form>
      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Substore value (at cost)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const isOpen = expanded.has(row.user.id);
              const totalVal = substoreTotalValue(row.batches);
              return (
                <Fragment key={row.user.id}>
                  <TableRow className={cn(isOpen && "bg-[var(--surface-2)]")}>
                    <TableCell className="align-middle">
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? "Collapse items" : "Expand items"}
                        onClick={() => toggleExpand(row.user.id)}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">{row.user.fullName}</TableCell>
                    <TableCell>{row.user.email}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatMoney(totalVal)}
                    </TableCell>
                  </TableRow>
                  {isOpen ? (
                    <TableRow className="bg-[var(--surface-2)] hover:bg-[var(--surface-2)]">
                      <TableCell colSpan={4} className="p-0">
                        <div className="border-t border-[var(--border)] px-4 py-3">
                          {row.batches.length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)]">No batch lines.</p>
                          ) : (
                            <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
                              <table className="w-full min-w-[520px] text-left text-sm">
                                <thead className="text-xs uppercase text-[var(--text-muted)]">
                                  <tr>
                                    <th className="px-3 py-2">Item</th>
                                    <th className="px-3 py-2">Batch</th>
                                    <th className="px-3 py-2 text-right">Qty</th>
                                    <th className="px-3 py-2 text-right">Unit cost</th>
                                    <th className="px-3 py-2 text-right">Line value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.batches.map((b) => {
                                    const lv = lineValue(b);
                                    return (
                                      <tr
                                        key={b.id}
                                        className="border-t border-[var(--border)]/80 text-[var(--text-primary)]"
                                      >
                                        <td className="px-3 py-2">{b.medicine?.name ?? "—"}</td>
                                        <td className="px-3 py-2 font-mono text-xs text-[var(--text-secondary)]">
                                          {b.batchNo ?? "—"}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{b.quantity}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">
                                          {formatMoney(num(b.buyingPrice))}
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums font-medium">
                                          {formatMoney(lv)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />
    </div>
  );
}
