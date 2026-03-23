"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

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
  drivers: DriverOption[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview";

export function VehicleManager({
  initialVehicles,
  drivers,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
}: VehicleManagerProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return vehicles.find((v) => v.id === selectedId) ?? null;
  }, [vehicles, selectedId]);

  async function refresh() {
    const res = await fetch("/api/vehicles", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh vehicles list");
    const next = (await res.json()) as Vehicle[];
    setVehicles(next);
  }

  async function handleDelete(id: string) {
    setError(null);
    if (!window.confirm("Delete this vehicle?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Not allowed to delete or request failed");
      }
      await refresh();
      if (selectedId === id) {
        setSelectedId(null);
        setMode("none");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage vehicles (create, edit, delete, preview).
        </div>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Button
              variant="primary"
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
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
              }
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {mode === "create" ? (
        <VehicleForm
          title="Create vehicle"
          submitLabel="Create"
          drivers={drivers}
          onCancel={() => setMode("none")}
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
      ) : null}

      {mode === "edit" && selected ? (
        <VehicleForm
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
          }}
        />
      ) : null}

      {mode === "preview" && selected ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold">Preview vehicle</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Read-only details.
              </div>
            </div>
            <Button variant="secondary" onClick={() => setMode("none")}>
              Close
            </Button>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Vehicle No</dt>
              <dd className="font-medium">{selected.vehicleNo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Model</dt>
              <dd className="font-medium">{selected.model ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Status</dt>
              <dd className="font-medium">{selected.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Current Driver</dt>
              <dd className="font-medium">{selected.currentDriver?.fullName ?? "—"}</dd>
            </div>
          </dl>
        </div>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Vehicle No</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Current Driver</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const isBusy = busyId === v.id;
              return (
                <tr key={v.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{v.vehicleNo}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{v.model ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{v.status}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {v.currentDriver?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
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
                          variant="ghost"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(v.id);
                            setMode("edit");
                            setError(null);
                          }}
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => handleDelete(v.id)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
  drivers,
  onCancel,
  onSubmit,
  initial,
}: {
  title: string;
  submitLabel: string;
  drivers: DriverOption[];
  onCancel: () => void;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  initial?: Partial<VehicleFormValues>;
}) {
  const [values, setValues] = useState<VehicleFormValues>({
    vehicleNo: initial?.vehicleNo ?? "",
    model: initial?.model ?? "",
    status: initial?.status ?? "Available",
    currentDriverId: initial?.currentDriverId ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="text-lg font-semibold">{title}</div>
        <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
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
            setError(e instanceof Error ? e.message : "Something went wrong");
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
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Status</span>
          <select
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
            value={values.status ?? "Available"}
            onChange={(e) => setValues((v) => ({ ...v, status: e.target.value }))}
          >
            {["Available", "In Service", "Maintenance", "Inactive"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Current Driver</span>
          <select
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-zinc-800"
            value={values.currentDriverId ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, currentDriverId: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.fullName}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}

