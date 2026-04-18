"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { useTableListSearch } from "@/lib/useTableListSearch";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";

export type Vehicle = {
  id: string;
  vehicleNo: string;
  model?: string | null;
  status: string;
  statusId?: string | null;
  currentDriverId?: string | null;
  currentDriver?: { id: string; fullName: string; email?: string | null } | null;
};

type DriverOption = { id: string; fullName: string };

type VehicleManagerProps = {
  initialVehicles: Vehicle[];
  total: number;
  initialPage: number;
  pageSize?: number;
  drivers: DriverOption[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  initialQuery?: string;
};

type Mode = "none" | "create" | "edit" | "preview";

type ActionConfirm = null | { type: "edit" | "delete"; id: string };

export function VehicleManager({
  initialVehicles,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  drivers,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
  initialQuery = "",
}: VehicleManagerProps) {
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return vehicles.find((v) => v.id === selectedId) ?? null;
  }, [vehicles, selectedId]);

  useEffect(() => {
    setVehicles(initialVehicles);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialVehicles, initialTotal, initialPage]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) ||
      (mode === "edit" && canEdit) ||
      (mode === "preview" && canPreview),
  );

  async function loadPage(nextPage: number) {
    const res = await fetch(`/api/vehicles?${pageQueryString(nextPage, pageSize, searchInput)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh vehicles list");
    const data = (await res.json()) as PaginatedResult<Vehicle>;
    setVehicles(data.items);
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
    const res = await fetch(`/api/vehicles?${pageQueryString(page, pageSize, searchInput)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh vehicles list");
    const data = (await res.json()) as PaginatedResult<Vehicle>;
    setVehicles(data.items);
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
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Not allowed to delete or request failed");
      }
      await refresh();
      toast.success("Vehicle deleted");
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

  return (
    <div className="flex flex-col gap-6">
      <ConfirmModal
        open={actionConfirm !== null}
        title={
          actionConfirm?.type === "delete" ? "Delete vehicle?" : "Edit vehicle?"
        }
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this vehicle? This action cannot be undone."
            : "Are you sure you want to edit this vehicle?"
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
        title="Vehicles"
        note="Actions are controlled by permissions."
        description="Manage vehicles (create, edit, delete, preview)."
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
              Create vehicle
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
                toast.success("Vehicles refreshed");
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

      <TableSearchBar
        id="vehicles-table-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Vehicle no., model, driver…"
      />

      {mode === "create" && canCreate ? (
        <ModalShell
          open
          titleId="create-vehicle-title"
          title="Create vehicle"
          subtitle="Register a vehicle number, optional model, status, and assigned driver."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <VehicleForm
                layout="modal"
                intent="create"
                title="Create vehicle"
                submitLabel="Create"
                drivers={drivers}
                onCancel={() => {
                  setMode("none");
                  setError(null);
                }}
                onSubmit={async (data) => {
                  setError(null);
                  const res = await fetch("/api/vehicles", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  if (!res.ok) {
                    const msg = await res.text().catch(() => "");
                    throw new Error(msg || "Create failed");
                  }
                  await refresh();
                  setMode("none");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          titleId="edit-vehicle-title"
          title="Edit vehicle"
          subtitle="Update vehicle details and assigned driver."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <VehicleForm
                layout="modal"
                intent="edit"
                title="Edit vehicle"
                submitLabel="Save changes"
                drivers={drivers}
                initial={{
                  vehicleNo: selected.vehicleNo,
                  model: selected.model ?? "",
                  status: selected.status,
                  currentDriverId: selected.currentDriverId ?? "",
                }}
                onCancel={() => setMode("none")}
                onSubmit={async (data) => {
                  setError(null);
                  const res = await fetch(`/api/vehicles/${selected.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  if (!res.ok) {
                    const msg = await res.text().catch(() => "");
                    throw new Error(msg || "Update failed");
                  }
                  await refresh();
                  setMode("none");
                  toast.success("Vehicle updated");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          open
          titleId="preview-vehicle-title"
          title="Preview vehicle"
          subtitle="Read-only details."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div className="preview-shell sm:grid-cols-2">
                <section className="preview-section">
                  <h3 className="preview-section-title">Vehicle</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Vehicle No</dt>
                      <dd className="preview-value">{selected.vehicleNo}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Model</dt>
                      <dd className="preview-value">{selected.model ?? "—"}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Assignment & Status</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Status</dt>
                      <dd className="preview-value">{selected.status}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Current Driver</dt>
                      <dd className="preview-value">{selected.currentDriver?.fullName ?? "—"}</dd>
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
              <TableHead>Vehicle No</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Current Driver</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((v) => {
              const isBusy = busyId === v.id;
              return (
                <TableRow key={v.id} >
                  <TableCell className="font-medium">{v.vehicleNo}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{v.model ?? "—"}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{v.status}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {v.currentDriver?.fullName ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="preview"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(v.id);
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
                          onClick={() => setActionConfirm({ type: "edit", id: v.id })}
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
                          onClick={() => setActionConfirm({ type: "delete", id: v.id })}
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

type VehicleFormValues = {
  vehicleNo: string;
  model?: string;
  status?: string;
  currentDriverId?: string;
};

function VehicleForm({
  title,
  submitLabel,
  intent,
  drivers,
  onCancel,
  onSubmit,
  initial,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  intent: "create" | "edit";
  drivers: DriverOption[];
  onCancel: () => void;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  initial?: Partial<VehicleFormValues>;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<VehicleFormValues>({
    vehicleNo: initial?.vehicleNo ?? "",
    model: initial?.model ?? "",
    status: initial?.status ?? "Available",
    currentDriverId: initial?.currentDriverId ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

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
            const payload: VehicleFormValues = {
              vehicleNo: values.vehicleNo.trim(),
              model: values.model?.trim() ? values.model.trim() : undefined,
              status: values.status?.trim() ? values.status.trim() : undefined,
              currentDriverId: values.currentDriverId?.trim() ? values.currentDriverId : "",
            };
            await onSubmit(payload);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Something went wrong";
            setError(msg);
            toast.error(msg);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Input
          label="Vehicle No"
          name="vehicleNo"
          value={values.vehicleNo}
          onChange={(e) => setValues((v) => ({ ...v, vehicleNo: e.target.value }))}
          required
        />
        <Input
          label="Model"
          name="model"
          value={values.model ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, model: e.target.value }))}
        />

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Status</span>
          <SelectBase
            className={selectClass}
            value={values.status ?? "Available"}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
          >
            {["Available", "In Service", "Maintenance", "Inactive"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectBase>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Current Driver</span>
          <SelectBase
            className={selectClass}
            value={values.currentDriverId ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, currentDriverId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName}
              </option>
            ))}
          </SelectBase>
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

