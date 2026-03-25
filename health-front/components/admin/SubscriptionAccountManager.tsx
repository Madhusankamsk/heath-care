"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";

type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type PlanOption = { id: string; planName: string; isActive?: boolean };
type PatientOption = { id: string; fullName: string; contactNo?: string | null };

export type SubscriptionAccount = {
  id: string;
  accountName?: string | null;
  planId: string;
  primaryContactId: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  statusId?: string | null;
  plan?: { id: string; planName: string } | null;
  primaryContact?: { id: string; fullName: string; contactNo?: string | null } | null;
  statusLookup?: { id: string; lookupValue: string } | null;
  members?: Array<{
    id: string;
    patientId: string;
    joinedAt: string | Date;
    patient?: { id: string; fullName: string } | null;
  }>;
};

type SubscriptionAccountManagerProps = {
  initialAccounts: SubscriptionAccount[];
  plans: PlanOption[];
  patients: PatientOption[];
  statuses: LookupOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview";
type ActionConfirm = null | { type: "edit" | "delete"; id: string };

function toDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function SubscriptionAccountManager({
  initialAccounts,
  plans,
  patients,
  statuses,
  canCreate,
  canEdit,
  canDelete,
}: SubscriptionAccountManagerProps) {
  const [accounts, setAccounts] = useState<SubscriptionAccount[]>(initialAccounts);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return accounts.find((a) => a.id === selectedId) ?? null;
  }, [accounts, selectedId]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) || (mode === "edit" && canEdit) || mode === "preview",
  );

  async function refresh() {
    const res = await fetch("/api/subscription-accounts", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh subscription accounts");
    const next = (await res.json()) as SubscriptionAccount[];
    setAccounts(next);
  }

  async function performDelete(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/subscription-accounts/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Delete failed");
      }
      await refresh();
      toast.success("Subscription account deleted");
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
        title={actionConfirm?.type === "delete" ? "Delete subscription account?" : "Edit account?"}
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this account? This action cannot be undone."
            : "Are you sure you want to edit this account?"
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
          Manage family/corporate subscription accounts (create, edit, delete, preview).
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
              Create account
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
                toast.success("Subscription accounts refreshed");
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
          titleId="create-subscription-account-title"
          title="Create subscription account"
          subtitle="Add account name, plan, primary contact, dates, and status."
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <SubscriptionAccountForm
            intent="create"
            title="Create subscription account"
            submitLabel="Create"
            plans={plans}
            patients={patients}
            statuses={statuses}
            onCancel={() => setMode("none")}
            onSubmit={async (values) => {
              const res = await fetch("/api/subscription-accounts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });
              if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || "Create failed");
              }
              await refresh();
              setMode("none");
              toast.success("Subscription account created");
            }}
          />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          titleId="edit-subscription-account-title"
          title="Edit subscription account"
          subtitle="Update plan, primary contact, dates, and status."
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <SubscriptionAccountForm
            intent="edit"
            title="Edit subscription account"
            submitLabel="Save changes"
            plans={plans}
            patients={patients}
            statuses={statuses}
            initial={{
              accountName: selected.accountName ?? "",
              planId: selected.planId,
              primaryContactId: selected.primaryContactId,
              startDate: toDateInputValue(selected.startDate),
              endDate: toDateInputValue(selected.endDate),
              statusId: selected.statusId ?? "",
            }}
            onCancel={() => setMode("none")}
            onSubmit={async (values) => {
              const res = await fetch(`/api/subscription-accounts/${selected.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });
              if (!res.ok) {
                const msg = await res.text().catch(() => "");
                throw new Error(msg || "Update failed");
              }
              await refresh();
              setMode("none");
              toast.success("Subscription account updated");
            }}
          />
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          titleId="preview-subscription-account-title"
          title="Preview subscription account"
          subtitle="Read-only account details."
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div className="preview-shell sm:grid-cols-2">
            <section className="preview-section">
              <h3 className="preview-section-title">Account</h3>
              <dl className="preview-list">
                <div className="preview-row">
                  <dt className="preview-label">Account Name</dt>
                  <dd className="preview-value">{selected.accountName ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Plan</dt>
                  <dd className="preview-value">{selected.plan?.planName ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Status</dt>
                  <dd className="preview-value">{selected.statusLookup?.lookupValue ?? "—"}</dd>
                </div>
              </dl>
            </section>
            <section className="preview-section">
              <h3 className="preview-section-title">Contact & Dates</h3>
              <dl className="preview-list">
                <div className="preview-row">
                  <dt className="preview-label">Primary Contact</dt>
                  <dd className="preview-value">{selected.primaryContact?.fullName ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Start Date</dt>
                  <dd className="preview-value">{toDateInputValue(selected.startDate) || "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">End Date</dt>
                  <dd className="preview-value">{toDateInputValue(selected.endDate) || "—"}</dd>
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
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Primary Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => {
              const isBusy = busyId === row.id;
              return (
                <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{row.accountName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.plan?.planName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.primaryContact?.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.statusLookup?.lookupValue ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="preview"
                        className="h-9 px-3"
                        disabled={isBusy}
                        onClick={() => {
                          setSelectedId(row.id);
                          setMode("preview");
                        }}
                      >
                        Preview
                      </Button>
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="edit"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => setActionConfirm({ type: "edit", id: row.id })}
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
                          onClick={() => setActionConfirm({ type: "delete", id: row.id })}
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

function ModalShell({
  titleId,
  title,
  subtitle,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <Card>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">{subtitle}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}

type FormValues = {
  accountName?: string;
  planId: string;
  primaryContactId: string;
  startDate?: string;
  endDate?: string;
  statusId?: string;
};

function SubscriptionAccountForm({
  intent,
  title,
  submitLabel,
  plans,
  patients,
  statuses,
  initial,
  onCancel,
  onSubmit,
}: {
  intent: "create" | "edit";
  title: string;
  submitLabel: string;
  plans: PlanOption[];
  patients: PatientOption[];
  statuses: LookupOption[];
  initial?: Partial<FormValues>;
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>({
    accountName: initial?.accountName ?? "",
    planId: initial?.planId ?? plans[0]?.id ?? "",
    primaryContactId: initial?.primaryContactId ?? patients[0]?.id ?? "",
    startDate: initial?.startDate ?? "",
    endDate: initial?.endDate ?? "",
    statusId: initial?.statusId ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  return (
    <>
      <div className="mb-4 text-sm text-[var(--text-secondary)]">{title}</div>
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
            if (!values.planId.trim() || !values.primaryContactId.trim()) {
              throw new Error("Plan and Primary Contact are required");
            }
            await onSubmit({
              accountName: values.accountName?.trim() || undefined,
              planId: values.planId.trim(),
              primaryContactId: values.primaryContactId.trim(),
              startDate: values.startDate?.trim() || undefined,
              endDate: values.endDate?.trim() || undefined,
              statusId: values.statusId?.trim() || undefined,
            });
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
          label="Account Name"
          name="accountName"
          value={values.accountName ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, accountName: e.target.value }))}
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Plan</span>
          <select
            className={selectClass}
            value={values.planId}
            onChange={(e) => setValues((v) => ({ ...v, planId: e.target.value }))}
            required
          >
            <option value="">Select</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.planName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Primary Contact</span>
          <select
            className={selectClass}
            value={values.primaryContactId}
            onChange={(e) => setValues((v) => ({ ...v, primaryContactId: e.target.value }))}
            required
          >
            <option value="">Select</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </label>
        <Input
          label="Start Date"
          name="startDate"
          type="date"
          value={values.startDate ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))}
        />
        <Input
          label="End Date"
          name="endDate"
          type="date"
          value={values.endDate ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))}
        />
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Status</span>
          <select
            className={selectClass}
            value={values.statusId ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, statusId: e.target.value }))}
          >
            <option value="">Select</option>
            {statuses.map((st) => (
              <option key={st.id} value={st.id}>
                {st.lookupValue}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant={intent === "create" ? "create" : "edit"} isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </>
  );
}

