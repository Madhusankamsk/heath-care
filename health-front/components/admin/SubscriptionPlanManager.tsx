"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { CheckboxBase } from "@/components/ui/checkbox-base";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";

export type SubscriptionPlan = {
  id: string;
  planName: string;
  planTypeId: string;
  price: number | string;
  maxMembers: number;
  durationDays: number;
  isActive: boolean;
  planTypeLookup?: { id: string; lookupKey: string; lookupValue: string } | null;
};

type PlanTypeOption = { id: string; lookupKey: string; lookupValue: string };

type SubscriptionPlanManagerProps = {
  initialPlans: SubscriptionPlan[];
  total: number;
  initialPage: number;
  pageSize?: number;
  planTypes: PlanTypeOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview";

type ActionConfirm = null | { type: "edit" | "delete"; id: string };

export function SubscriptionPlanManager({
  initialPlans,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  planTypes,
  canCreate,
  canEdit,
  canDelete,
}: SubscriptionPlanManagerProps) {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialPlans);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return plans.find((p) => p.id === selectedId) ?? null;
  }, [plans, selectedId]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) || (mode === "edit" && canEdit) || mode === "preview",
  );

  async function loadPage(nextPage: number) {
    const res = await fetch(`/api/subscription-plans?page=${nextPage}&pageSize=${pageSize}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh subscription plans");
    const data = (await res.json()) as PaginatedResult<SubscriptionPlan>;
    setPlans(data.items);
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
    const res = await fetch(`/api/subscription-plans?page=${page}&pageSize=${pageSize}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh subscription plans");
    const data = (await res.json()) as PaginatedResult<SubscriptionPlan>;
    setPlans(data.items);
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
      const res = await fetch(`/api/subscription-plans/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Delete failed");
      }
      await refresh();
      toast.success("Subscription plan deleted");
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
          actionConfirm?.type === "delete"
            ? "Delete subscription plan?"
            : "Edit subscription plan?"
        }
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this subscription plan? This cannot be undone."
            : "Are you sure you want to edit this subscription plan?"
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
        title="Plan setup"
        note="Actions are controlled by permissions."
        description="Manage subscription plans (create, edit, delete, preview)."
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
              Create plan
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
                toast.success("Subscription plans refreshed");
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

      {mode === "create" && canCreate ? (
        <ModalShell
          open
          titleId="create-subscription-plan-title"
          title="Create subscription plan"
          subtitle="Add a new plan with pricing, duration, and member limits."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <SubscriptionPlanForm
                layout="modal"
                intent="create"
                title="Create subscription plan"
                submitLabel="Create"
                planTypes={planTypes}
                onCancel={() => {
                  setMode("none");
                  setError(null);
                }}
                onSubmit={async (values) => {
                  const res = await fetch("/api/subscription-plans", {
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
                  toast.success("Subscription plan created");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          titleId="edit-subscription-plan-title"
          title="Edit subscription plan"
          subtitle="Update plan details, pricing, and status."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <SubscriptionPlanForm
                layout="modal"
                intent="edit"
                title="Edit subscription plan"
                submitLabel="Save changes"
                planTypes={planTypes}
                initial={{
                  planName: selected.planName,
                  planTypeId: selected.planTypeId,
                  price: String(selected.price),
                  maxMembers: String(selected.maxMembers),
                  durationDays: String(selected.durationDays),
                  isActive: selected.isActive,
                }}
                onCancel={() => setMode("none")}
                onSubmit={async (values) => {
                  const res = await fetch(`/api/subscription-plans/${selected.id}`, {
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
                  toast.success("Subscription plan updated");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          open
          titleId="preview-subscription-plan-title"
          title="Preview subscription plan"
          subtitle="Read-only details."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div className="preview-shell sm:grid-cols-2">
                <section className="preview-section">
                  <h3 className="preview-section-title">Plan</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Plan Name</dt>
                      <dd className="preview-value">{selected.planName}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Plan Type</dt>
                      <dd className="preview-value">{selected.planTypeLookup?.lookupValue ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Status</dt>
                      <dd className="preview-value">{selected.isActive ? "Active" : "Inactive"}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Pricing & Limits</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Price</dt>
                      <dd className="preview-value">{String(selected.price)}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Duration (days)</dt>
                      <dd className="preview-value">{selected.durationDays}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Max Members</dt>
                      <dd className="preview-value">{selected.maxMembers}</dd>
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
              <TableHead>Plan</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => {
              const isBusy = busyId === plan.id;
              return (
                <TableRow key={plan.id} >
                  <TableCell className="font-medium">{plan.planName}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {plan.planTypeLookup?.lookupValue ?? "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{String(plan.price)}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{plan.durationDays}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">{plan.maxMembers}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {plan.isActive ? "Active" : "Inactive"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="preview"
                        className="h-9 px-3"
                        disabled={isBusy}
                        onClick={() => {
                          setSelectedId(plan.id);
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
                          onClick={() =>
                            setActionConfirm({ type: "edit", id: plan.id })
                          }
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
                          onClick={() =>
                            setActionConfirm({ type: "delete", id: plan.id })
                          }
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

type SubscriptionPlanFormValues = {
  planName: string;
  planTypeId: string;
  price: string;
  maxMembers: string;
  durationDays: string;
  isActive: boolean;
};

function SubscriptionPlanForm({
  title,
  submitLabel,
  intent,
  planTypes,
  onCancel,
  onSubmit,
  initial,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  intent: "create" | "edit";
  planTypes: PlanTypeOption[];
  onCancel: () => void;
  onSubmit: (values: SubscriptionPlanFormValues) => Promise<void>;
  initial?: Partial<SubscriptionPlanFormValues>;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<SubscriptionPlanFormValues>({
    planName: initial?.planName ?? "",
    planTypeId: initial?.planTypeId ?? planTypes[0]?.id ?? "",
    price: initial?.price ?? "",
    maxMembers: initial?.maxMembers ?? "1",
    durationDays: initial?.durationDays ?? "",
    isActive: initial?.isActive ?? true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            await onSubmit(values);
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
          label="Plan name"
          name="planName"
          value={values.planName}
          onChange={(e) => setValues((v) => ({ ...v, planName: e.target.value }))}
          required
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Plan type</span>
          <SelectBase
            className="h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25"
            value={values.planTypeId}
            onChange={(e) => setValues((v) => ({ ...v, planTypeId: e.target.value }))}
            required
          >
            {planTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.lookupValue}
              </option>
            ))}
          </SelectBase>
        </label>
        <Input
          label="Price"
          name="price"
          inputMode="decimal"
          value={values.price}
          onChange={(e) => setValues((v) => ({ ...v, price: e.target.value }))}
          required
        />
        <Input
          label="Duration days"
          name="durationDays"
          inputMode="numeric"
          value={values.durationDays}
          onChange={(e) => setValues((v) => ({ ...v, durationDays: e.target.value }))}
          required
        />
        <Input
          label="Max members"
          name="maxMembers"
          inputMode="numeric"
          value={values.maxMembers}
          onChange={(e) => setValues((v) => ({ ...v, maxMembers: e.target.value }))}
          required
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <CheckboxBase
            checked={values.isActive}
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

  return (
    <div className="surface-card p-6">
      {formBody}
    </div>
  );
}

