"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { pageQueryString, type PaginatedResult } from "@/lib/pagination";
import { useTableListSearch } from "@/lib/useTableListSearch";
import { toast } from "@/lib/toast";

type MedicineOption = { id: string; name: string };
type Batch = {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  buyingPrice: number | string;
  locationType: string;
  locationId?: string | null;
  medicine: { id: string; name: string };
};

export function InventoryBatchManager({
  initialRows,
  total: initialTotal,
  initialPage,
  pageSize: initialPageSize,
  medicines,
  initialQuery = "",
}: {
  initialRows: Batch[];
  total: number;
  initialPage: number;
  pageSize: number;
  medicines: MedicineOption[];
  initialQuery?: string;
}) {
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery ?? "");
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const pageSize = initialPageSize;
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);

  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialRows, initialTotal, initialPage]);

  const loadPage = useCallback(
    async (nextPage: number) => {
      const res = await fetch(
        `/api/inventory/batches?${pageQueryString(nextPage, pageSize, searchInput)}`,
        {
        cache: "no-store",
      },
      );
      if (!res.ok) throw new Error("Failed to load");
      const data = (await res.json()) as PaginatedResult<Batch>;
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
    },
    [pageSize, searchInput],
  );

  async function refresh() {
    const res = await fetch(`/api/inventory/batches?${pageQueryString(page, pageSize, searchInput)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh");
    const data = (await res.json()) as PaginatedResult<Batch>;
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
    await loadPage(clamped);
  }

  return (
    <div className="flex flex-col gap-4">
      <CrudToolbar title="Batches" description="Track item quantities by batch and location.">
        <Button variant="create" className="h-10 px-4 text-xs sm:text-sm" onClick={() => { setEditingId(null); setOpen(true); }}>
          Create batch
        </Button>
        <Button variant="secondary" onClick={() => void refresh()}>Refresh</Button>
      </CrudToolbar>
      <TableSearchBar
        id="inventory-batches-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Batch no., medicine name…"
      />
      {open ? (
        <ModalShell
          open
          onClose={() => setOpen(false)}
          titleId="batch-form-title"
          title={editing ? "Edit batch" : "Create batch"}
          subtitle="Assign batch quantities and location."
          maxWidthClass="max-w-3xl"
        >
          <BatchForm
            medicines={medicines}
            initial={editing ?? undefined}
            onCancel={() => setOpen(false)}
            onSubmit={async (payload) => {
              const url = editing ? `/api/inventory/batches/${editing.id}` : "/api/inventory/batches";
              const method = editing ? "PUT" : "POST";
              const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Save failed");
              await refresh();
              setOpen(false);
              toast.success(editing ? "Batch updated" : "Batch created");
            }}
          />
        </ModalShell>
      ) : null}
      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Buy Price</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.medicine?.name ?? "—"}</TableCell>
                <TableCell>{row.batchNo}</TableCell>
                <TableCell>{new Date(row.expiryDate).toISOString().slice(0, 10)}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.buyingPrice}</TableCell>
                <TableCell>{row.locationType}{row.locationId ? ` (${row.locationId})` : ""}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="edit" className="h-9 px-3" onClick={() => { setEditingId(row.id); setOpen(true); }}>Edit</Button>
                    <Button
                      variant="delete"
                      className="h-9 px-3"
                      onClick={async () => {
                        const res = await fetch(`/api/inventory/batches/${row.id}`, { method: "DELETE" });
                        if (!res.ok && res.status !== 204) {
                          toast.error("Delete failed");
                          return;
                        }
                        await refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />
    </div>
  );
}

function BatchForm({
  medicines,
  initial,
  onCancel,
  onSubmit,
}: {
  medicines: MedicineOption[];
  initial?: Partial<Batch>;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [values, setValues] = useState({
    medicineId: initial?.medicineId ?? medicines[0]?.id ?? "",
    batchNo: initial?.batchNo ?? "",
    expiryDate: initial?.expiryDate ? new Date(initial.expiryDate).toISOString().slice(0, 10) : "",
    quantity: String(initial?.quantity ?? ""),
    buyingPrice: String(initial?.buyingPrice ?? ""),
    locationType: initial?.locationType ?? "WAREHOUSE",
    locationId: initial?.locationId ?? "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit({
            medicineId: values.medicineId,
            batchNo: values.batchNo,
            expiryDate: values.expiryDate,
            quantity: Number(values.quantity),
            buyingPrice: Number(values.buyingPrice),
            locationType: values.locationType,
            locationId: values.locationId || null,
          });
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Save failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-[var(--text-primary)]">Item</span>
        <SelectBase value={values.medicineId} onChange={(e) => setValues((v) => ({ ...v, medicineId: e.target.value }))}>
          {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </SelectBase>
      </label>
      <Input label="Batch No" name="batchNo" value={values.batchNo} onChange={(e) => setValues((v) => ({ ...v, batchNo: e.target.value }))} required />
      <Input label="Expiry Date" name="expiryDate" type="date" value={values.expiryDate} onChange={(e) => setValues((v) => ({ ...v, expiryDate: e.target.value }))} required />
      <Input label="Quantity" name="quantity" type="number" value={values.quantity} onChange={(e) => setValues((v) => ({ ...v, quantity: e.target.value }))} required />
      <Input label="Buying Price" name="buyingPrice" type="number" value={values.buyingPrice} onChange={(e) => setValues((v) => ({ ...v, buyingPrice: e.target.value }))} required />
      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-[var(--text-primary)]">Location Type</span>
        <SelectBase value={values.locationType} onChange={(e) => setValues((v) => ({ ...v, locationType: e.target.value }))}>
          <option value="WAREHOUSE">Warehouse</option>
          <option value="NURSE">Nurse</option>
          <option value="VEHICLE">Vehicle</option>
        </SelectBase>
      </label>
      <Input label="Location Id (optional)" name="locationId" value={values.locationId} onChange={(e) => setValues((v) => ({ ...v, locationId: e.target.value }))} />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="create" isLoading={busy}>Save</Button>
      </div>
    </form>
  );
}
