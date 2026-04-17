"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";

export type InventoryEntity = {
  id: string;
  name: string;
  genericName?: string | null;
  sellingPrice: number | string;
  uom?: string | null;
  minStockLevel?: number | null;
  totalQuantity?: number;
};

type Props = {
  title: string;
  endpoint: "/api/inventory/medicines" | "/api/inventory/medical-items";
  initialRows: InventoryEntity[];
  total: number;
  initialPage: number;
  pageSize?: number;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export function InventoryEntityManager({
  title,
  endpoint,
  initialRows,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  canCreate,
  canEdit,
  canDelete,
}: Props) {
  const [rows, setRows] = useState(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = useMemo(
    () => (selectedId ? rows.find((r) => r.id === selectedId) ?? null : null),
    [rows, selectedId],
  );

  async function loadPage(nextPage: number) {
    const res = await fetch(`${endpoint}?page=${nextPage}&pageSize=${pageSize}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh");
    const data = (await res.json()) as PaginatedResult<InventoryEntity>;
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

  async function refresh() {
    const res = await fetch(`${endpoint}?page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh");
    const data = (await res.json()) as PaginatedResult<InventoryEntity>;
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
    if (data.items.length === 0 && data.page > 1) {
      await loadPage(data.page - 1);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ConfirmModal
        open={Boolean(deleteId)}
        title="Delete item?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="delete"
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          const res = await fetch(`${endpoint}/${deleteId}`, { method: "DELETE" });
          if (!res.ok && res.status !== 204) {
            const msg = await res.text().catch(() => "");
            toast.error(msg || "Delete failed");
            return;
          }
          setDeleteId(null);
          await refresh();
          toast.success("Deleted");
        }}
      />
      {error ? (
        <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
      <CrudToolbar title={title} description="Manage stock master data." note="Permission-based actions.">
        {canCreate ? (
          <Button
            variant="create"
            className="h-10 px-4 text-xs sm:text-sm"
            onClick={() => {
              setSelectedId(null);
              setMode("create");
            }}
          >
            Create
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={async () => {
            try {
              await refresh();
              toast.success("Refreshed");
            } catch (e) {
              setError(e instanceof Error ? e.message : "Refresh failed");
            }
          }}
        >
          Refresh
        </Button>
      </CrudToolbar>

      {mode === "create" ? (
        <ModalShell
          open
          onClose={() => setMode("none")}
          titleId={`create-${title}`}
          title={`Create ${title.slice(0, -1)}`}
          subtitle="Provide the master inventory details."
          maxWidthClass="max-w-3xl"
        >
          <InventoryEntityForm
            submitLabel="Create"
            onCancel={() => setMode("none")}
            onSubmit={async (payload) => {
              const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Create failed");
              await refresh();
              setMode("none");
              toast.success("Created");
            }}
          />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          onClose={() => setMode("none")}
          titleId={`edit-${title}`}
          title={`Edit ${title.slice(0, -1)}`}
          subtitle="Update master inventory details."
          maxWidthClass="max-w-3xl"
        >
          <InventoryEntityForm
            submitLabel="Save changes"
            initial={selected}
            onCancel={() => setMode("none")}
            onSubmit={async (payload) => {
              const res = await fetch(`${endpoint}/${selected.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Update failed");
              await refresh();
              setMode("none");
              toast.success("Updated");
            }}
          />
        </ModalShell>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Generic</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>Min Stock</TableHead>
              <TableHead>Total Qty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.genericName || "—"}</TableCell>
                <TableCell>{row.sellingPrice}</TableCell>
                <TableCell>{row.uom || "—"}</TableCell>
                <TableCell>{row.minStockLevel ?? "—"}</TableCell>
                <TableCell>{row.totalQuantity ?? 0}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    {canEdit ? (
                      <Button
                        variant="edit"
                        className="h-9 px-3"
                        onClick={() => {
                          setSelectedId(row.id);
                          setMode("edit");
                        }}
                      >
                        Edit
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button variant="delete" className="h-9 px-3" onClick={() => setDeleteId(row.id)}>
                        Delete
                      </Button>
                    ) : null}
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

function InventoryEntityForm({
  submitLabel,
  initial,
  onCancel,
  onSubmit,
}: {
  submitLabel: string;
  initial?: Partial<InventoryEntity>;
  onCancel: () => void;
  onSubmit: (payload: {
    name: string;
    genericName?: string;
    sellingPrice: number;
    uom?: string;
    minStockLevel?: number;
  }) => Promise<void>;
}) {
  const [values, setValues] = useState({
    name: initial?.name ?? "",
    genericName: initial?.genericName ?? "",
    sellingPrice: String(initial?.sellingPrice ?? ""),
    uom: initial?.uom ?? "",
    minStockLevel: String(initial?.minStockLevel ?? ""),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await onSubmit({
            name: values.name.trim(),
            genericName: values.genericName.trim() || undefined,
            sellingPrice: Number(values.sellingPrice),
            uom: values.uom.trim() || undefined,
            minStockLevel: values.minStockLevel.trim() ? Number(values.minStockLevel) : undefined,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Save failed";
          setError(msg);
          toast.error(msg);
        } finally {
          setBusy(false);
        }
      }}
    >
      {error ? (
        <div className="sm:col-span-2 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}
      <Input label="Name" name="name" value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} required />
      <Input label="Generic Name" name="genericName" value={values.genericName} onChange={(e) => setValues((v) => ({ ...v, genericName: e.target.value }))} />
      <Input label="Selling Price" name="sellingPrice" type="number" value={values.sellingPrice} onChange={(e) => setValues((v) => ({ ...v, sellingPrice: e.target.value }))} required />
      <Input label="UOM" name="uom" value={values.uom} onChange={(e) => setValues((v) => ({ ...v, uom: e.target.value }))} />
      <Input label="Minimum Stock Level" name="minStockLevel" type="number" value={values.minStockLevel} onChange={(e) => setValues((v) => ({ ...v, minStockLevel: e.target.value }))} />
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="create" isLoading={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
