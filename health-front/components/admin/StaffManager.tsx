"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";

type Role = { id: string; roleName: string; description?: string | null };

export type StaffProfile = {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  baseConsultationFee?: number | string | null;
  isActive: boolean;
  role?: { id: string; roleName: string } | null;
  roleId?: string;
};

type StaffManagerProps = {
  initialProfiles: StaffProfile[];
  roles: Role[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview";

type ActionConfirm = null | { type: "edit" | "delete"; id: string };

export function StaffManager({
  initialProfiles,
  roles,
  canPreview,
  canCreate,
  canEdit,
  canDeactivate,
  canDelete,
}: StaffManagerProps) {
  const [profiles, setProfiles] = useState<StaffProfile[]>(initialProfiles);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return profiles.find((p) => p.id === selectedId) ?? null;
  }, [profiles, selectedId]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) ||
      (mode === "edit" && canEdit) ||
      (mode === "preview" && canPreview),
  );

  async function refresh() {
    const res = await fetch("/api/profiles", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh staff list");
    const next = (await res.json()) as StaffProfile[];
    setProfiles(next);
  }

  async function handleDeactivate(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/profiles/${id}/deactivate`, { method: "POST" });
      if (!res.ok) throw new Error("Not allowed to deactivate or request failed");
      await refresh();
      toast.success("Staff member marked inactive");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  async function performDelete(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
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
      <ConfirmModal
        open={actionConfirm !== null}
        title={
          actionConfirm?.type === "delete" ? "Delete staff member?" : "Edit staff member?"
        }
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this staff member? This cannot be undone."
            : "Are you sure you want to edit this staff member?"
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage staff accounts (create, edit, deactivate, delete, preview).
        </div>
        <div className="flex items-center gap-2">
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
              Create staff
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
                toast.success("Staff list refreshed");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Something went wrong";
                setError(msg);
                toast.error(msg);
              }
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {mode === "create" && canCreate ? (
        <ModalShell
          open
          titleId="create-staff-title"
          title="Create staff"
          subtitle="Add a team member with email, role, and a temporary password."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <StaffForm
                layout="modal"
                intent="create"
                title="Create staff"
                roles={roles}
                submitLabel="Create"
                onCancel={() => {
                  setMode("none");
                  setError(null);
                }}
                onSubmit={async (data) => {
                  setError(null);
                  const res = await fetch("/api/profiles", {
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
                  toast.success("Staff member created");
                }}
                includePassword
              />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          titleId="edit-staff-title"
          title="Edit staff"
          subtitle="Update staff account details and role assignment."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <StaffForm
                layout="modal"
                intent="edit"
                title="Edit staff"
                roles={roles}
                submitLabel="Save changes"
                initial={{
                  fullName: selected.fullName,
                  email: selected.email,
                  phoneNumber: selected.phoneNumber ?? "",
                  baseConsultationFee:
                    selected.baseConsultationFee === null ||
                    selected.baseConsultationFee === undefined
                      ? ""
                      : String(selected.baseConsultationFee),
                  roleId: selected.role?.id ?? selected.roleId ?? "",
                  isActive: selected.isActive,
                }}
                onCancel={() => setMode("none")}
                onSubmit={async (data) => {
                  setError(null);
                  const res = await fetch(`/api/profiles/${selected.id}`, {
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
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          open
          titleId="preview-staff-title"
          title="Preview staff"
          subtitle="Read-only details."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div className="preview-shell sm:grid-cols-2">
                <section className="preview-section">
                  <h3 className="preview-section-title">Profile</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Name</dt>
                      <dd className="preview-value">{selected.fullName}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Email</dt>
                      <dd className="preview-value">{selected.email}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Phone number</dt>
                      <dd className="preview-value">{selected.phoneNumber ?? "—"}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Role & Billing</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Role</dt>
                      <dd className="preview-value">{selected.role?.roleName ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Status</dt>
                      <dd className="preview-value">{selected.isActive ? "Active" : "Inactive"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Base fee</dt>
                      <dd className="preview-value">
                        {selected.baseConsultationFee === null ||
                        selected.baseConsultationFee === undefined
                          ? "—"
                          : String(selected.baseConsultationFee)}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
        </ModalShell>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const isBusy = busyId === p.id;
              return (
                <tr key={p.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{p.fullName}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{p.email}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.role?.roleName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                        p.isActive
                          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
                      ].join(" ")}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="preview"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(p.id);
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
                          onClick={() =>
                            setActionConfirm({ type: "edit", id: p.id })
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDeactivate ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 px-3"
                          disabled={isBusy || !p.isActive}
                          onClick={() => handleDeactivate(p.id)}
                        >
                          Inactive
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="delete"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() =>
                            setActionConfirm({ type: "delete", id: p.id })
                          }
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

type StaffFormValues = {
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  baseConsultationFee?: string;
  roleId: string;
  isActive?: boolean;
};

function StaffForm({
  title,
  roles,
  submitLabel,
  intent,
  onCancel,
  onSubmit,
  initial,
  includePassword,
  layout = "card",
}: {
  title: string;
  roles: Role[];
  submitLabel: string;
  intent: "create" | "edit";
  onCancel: () => void;
  onSubmit: (values: StaffFormValues) => Promise<void>;
  initial?: Partial<StaffFormValues>;
  includePassword?: boolean;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<StaffFormValues>({
    fullName: initial?.fullName ?? "",
    email: initial?.email ?? "",
    password: "",
    phoneNumber: initial?.phoneNumber ?? "",
    baseConsultationFee: initial?.baseConsultationFee ?? "",
    roleId: initial?.roleId ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  const formBody = (
    <>
      {layout === "card" ? (
        <div className="mb-6 flex items-center justify-between gap-3">
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
            const payload: StaffFormValues = {
              fullName: values.fullName.trim(),
              email: values.email.trim(),
              phoneNumber: values.phoneNumber?.trim() || undefined,
              roleId: values.roleId,
              isActive: values.isActive,
            };

            if (values.baseConsultationFee?.trim()) {
              payload.baseConsultationFee = values.baseConsultationFee.trim();
            }

            if (includePassword) {
              payload.password = values.password?.trim() || "";
            }

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
          label="Full name"
          name="fullName"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          required
          disabled={!includePassword && title.toLowerCase().includes("edit")}
        />
        {includePassword ? (
          <Input
            label="Temp password"
            name="password"
            type="password"
            value={values.password ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            required
          />
        ) : null}

        <Input
          label="Phone number"
          name="phoneNumber"
          value={values.phoneNumber ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, phoneNumber: e.target.value }))}
        />
        <Input
          label="Base consultation fee"
          name="baseConsultationFee"
          inputMode="decimal"
          value={values.baseConsultationFee ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, baseConsultationFee: e.target.value }))}
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Role</span>
          <select
            className={selectClass}
            value={values.roleId}
            onChange={(e) => setValues((v) => ({ ...v, roleId: e.target.value }))}
            required
          >
            <option value="" disabled>
              Select role…
            </option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.roleName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(values.isActive)}
            onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
          />
          Active
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

