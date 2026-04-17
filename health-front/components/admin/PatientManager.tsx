"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { PatientPreviewBody } from "@/components/admin/PatientPreviewBody";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import { Input } from "@/components/ui/Input";
import { CheckboxBase } from "@/components/ui/checkbox-base";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { emailInvoicePdf } from "@/lib/emailInvoicePdf";
import { openInvoicePdf } from "@/lib/openInvoicePdf";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";

export type Patient = {
  id: string;
  nicOrPassport?: string | null;
  fullName: string;
  shortName?: string | null;
  dob?: string | Date | null;
  contactNo?: string | null;
  whatsappNo?: string | null;
  /** Invoice and notification delivery */
  email?: string | null;
  gender?: string | null;
  genderId?: string | null;
  address?: string | null;
  hasInsurance?: boolean;
  hasGuardian?: boolean;
  guardianName?: string | null;
  guardianEmail?: string | null;
  guardianWhatsappNo?: string | null;
  guardianContactNo?: string | null;
  guardianRelationship?: string | null;
  billingRecipientId?: string | null;
  genderLookup?: { id: string; lookupValue: string } | null;
  billingRecipientLookup?: { id: string; lookupValue: string } | null;
  isSubscribed?: boolean;
  subscriptionPlanId?: string | null;
  subscriptionPlanName?: string | null;
  subscriptionStatusId?: string | null;
  subscriptionStatusName?: string | null;
  isSubscriptionAccountShared?: boolean;
};

type PatientManagerProps = {
  initialPatients: Patient[];
  /** Total row count from the server (all pages). */
  total: number;
  /** Current 1-based page (must match initialPatients fetch). */
  initialPage: number;
  pageSize?: number;
  genders: LookupOption[];
  billingRecipients: LookupOption[];
  subscriptionPlans: SubscriptionPlanOption[];
  subscriptionStatuses: LookupOption[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  openCreateOnMount?: boolean;
};
type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type SubscriptionPlanOption = { id: string; planName: string };

type Mode = "none" | "create" | "edit" | "preview";

type ActionConfirm = null | { type: "edit" | "delete"; id: string };

export function PatientManager({
  initialPatients,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  genders,
  billingRecipients,
  subscriptionPlans,
  subscriptionStatuses,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
  openCreateOnMount = false,
}: PatientManagerProps) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);
  const [invoiceReadyId, setInvoiceReadyId] = useState<string | null>(null);
  const router = useRouter();

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return patients.find((p) => p.id === selectedId) ?? null;
  }, [patients, selectedId]);

  useEffect(() => {
    if (!openCreateOnMount || !canCreate) return;
    setMode("create");
    setSelectedId(null);
    setError(null);
  }, [openCreateOnMount, canCreate]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) ||
      (mode === "edit" && canEdit) ||
      (mode === "preview" && canPreview),
  );

  useEscapeKey(() => setInvoiceReadyId(null), Boolean(invoiceReadyId));

  async function loadPage(nextPage: number) {
    const res = await fetch(`/api/patients?page=${nextPage}&pageSize=${pageSize}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh patient list");
    const data = (await res.json()) as PaginatedResult<Patient>;
    setPatients(data.items);
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
    const res = await fetch(`/api/patients?page=${page}&pageSize=${pageSize}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh patient list");
    const data = (await res.json()) as PaginatedResult<Patient>;
    setPatients(data.items);
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
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to delete patient or not allowed");
      }
      await refresh();
      toast.success("Patient deleted");
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
          actionConfirm?.type === "delete" ? "Delete patient?" : "Edit patient?"
        }
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this patient? This action cannot be undone."
            : "Are you sure you want to edit this patient?"
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
        title="Patients"
        note="Actions are controlled by permissions."
        description="Manage patients (create, edit, delete, preview)."
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
              Create patient
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
                toast.success("Patients refreshed");
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
          titleId="create-patient-title"
          title="Create patient"
          subtitle="Register patient demographics, guardian details, and plan assignment when subscribed."
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <PatientForm
                layout="modal"
                intent="create"
                title="Create patient"
                submitLabel="Create"
                genders={genders}
                billingRecipients={billingRecipients}
                subscriptionPlans={subscriptionPlans}
                subscriptionStatuses={subscriptionStatuses}
                includeSubscriptionPlan
                subscriptionStatusDisabled={false}
                onCancel={() => {
                  setMode("none");
                  setError(null);
                }}
                onSubmit={async (values) => {
                  setError(null);
                  const res = await fetch("/api/patients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                  });
                  const raw = await res.text().catch(() => "");
                  if (!res.ok) {
                    throw new Error(raw || "Create failed");
                  }
                  let invoiceId: string | undefined;
                  try {
                    const data = JSON.parse(raw) as { invoiceId?: string | null };
                    if (data.invoiceId) invoiceId = data.invoiceId;
                  } catch {
                    /* not JSON */
                  }
                  await refresh();
                  setMode("none");
                  toast.success("Patient created");
                  if (invoiceId) setInvoiceReadyId(invoiceId);
                }}
              />
        </ModalShell>
      ) : null}

      {invoiceReadyId ? (
        <ModalShell
          open
          titleId="invoice-ready-title"
          title="Subscription invoice"
          subtitle="Open the PDF or send it to the account contact email."
          onClose={() => setInvoiceReadyId(null)}
        >
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-10 px-4 text-xs sm:text-sm"
              onClick={() => {
                openInvoicePdf(invoiceReadyId);
              }}
            >
              Open PDF
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-10 px-4 text-xs sm:text-sm"
              onClick={() => void emailInvoicePdf(invoiceReadyId)}
            >
              Email invoice
            </Button>
          </div>
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          titleId="edit-patient-title"
          title="Edit patient"
          subtitle="Update patient demographics, guardian details, and plan assignment."
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <PatientForm
                layout="modal"
                intent="edit"
                title="Edit patient"
                submitLabel="Save changes"
                genders={genders}
                billingRecipients={billingRecipients}
                subscriptionPlans={subscriptionPlans}
                subscriptionStatuses={subscriptionStatuses}
                includeSubscriptionPlan
                subscriptionStatusDisabled={Boolean(selected.isSubscriptionAccountShared)}
                initial={{
                  nicOrPassport: selected.nicOrPassport ?? "",
                  fullName: selected.fullName,
                  shortName: selected.shortName ?? "",
                  dob: selected.dob ? String(selected.dob) : "",
                  contactNo: selected.contactNo ?? "",
                  whatsappNo: selected.whatsappNo ?? "",
                  email: selected.email ?? "",
                  genderId: selected.genderId ?? "",
                  address: selected.address ?? "",
                  hasInsurance: Boolean(selected.hasInsurance),
                  hasGuardian: Boolean(selected.hasGuardian),
                  guardianName: selected.guardianName ?? "",
                  guardianEmail: selected.guardianEmail ?? "",
                  guardianWhatsappNo: selected.guardianWhatsappNo ?? "",
                  guardianContactNo: selected.guardianContactNo ?? "",
                  guardianRelationship: selected.guardianRelationship ?? "",
                  billingRecipientId: selected.billingRecipientId ?? "",
                  isSubscribed: Boolean(selected.isSubscribed),
                  subscriptionPlanId: selected.subscriptionPlanId ?? "",
                  subscriptionStatusId: selected.subscriptionStatusId ?? "",
                }}
                onCancel={() => setMode("none")}
                onSubmit={async (values) => {
                  setError(null);
                  const res = await fetch(`/api/patients/${selected.id}`, {
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
                  toast.success("Patient updated");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          open
          titleId="preview-patient-title"
          title="Preview patient"
          subtitle="Read-only details."
          onClose={() => {
            setMode("none");
            setError(null);
          }}
          headerTrailing={
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3"
              onClick={() => {
                router.push(`/dashboard/clients/patient/${selected.id}`);
              }}
            >
              Full View
            </Button>
          }
        >
          <PatientPreviewBody patient={selected} />
        </ModalShell>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>NIC/Passport</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((p) => {
              const isBusy = busyId === p.id;
              return (
                <TableRow key={p.id} >
                  <TableCell className="font-medium">{p.fullName}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {p.nicOrPassport ?? "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {p.contactNo ?? "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {p.genderLookup?.lookupValue ?? p.gender ?? "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {p.isSubscribed ? p.subscriptionStatusName ?? "—" : "Not subscribed"}
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
                          onClick={() => setActionConfirm({ type: "edit", id: p.id })}
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
                          onClick={() => setActionConfirm({ type: "delete", id: p.id })}
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

type PatientFormValues = {
  isSubscribed?: boolean;
  nicOrPassport?: string;
  fullName: string;
  shortName?: string;
  dob?: string;
  contactNo?: string;
  whatsappNo?: string;
  email?: string;
  genderId?: string;
  address?: string;
  hasInsurance?: boolean;
  hasGuardian?: boolean;
  guardianName?: string;
  guardianEmail?: string;
  guardianWhatsappNo?: string;
  guardianContactNo?: string;
  guardianRelationship?: string;
  billingRecipientId?: string;
  subscriptionPlanId?: string;
  subscriptionStatusId?: string;
};

function PatientForm({
  title,
  submitLabel,
  intent,
  genders,
  billingRecipients,
  subscriptionPlans,
  subscriptionStatuses,
  includeSubscriptionPlan,
  subscriptionStatusDisabled = false,
  onCancel,
  onSubmit,
  initial,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  intent: "create" | "edit";
  genders: LookupOption[];
  billingRecipients: LookupOption[];
  subscriptionPlans: SubscriptionPlanOption[];
  subscriptionStatuses: LookupOption[];
  includeSubscriptionPlan?: boolean;
  subscriptionStatusDisabled?: boolean;
  onCancel: () => void;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  initial?: Partial<PatientFormValues>;
  layout?: "card" | "modal";
}) {
  // Billing recipient is a lookup. If the patient has no guardian, we force billing recipient to "Patient".
  const forcedPatientBillingRecipientId =
    billingRecipients.find((br) => br.lookupKey === "PATIENT")?.id ??
    billingRecipients[0]?.id ??
    "";

  const defaultSubscriptionStatusId =
    subscriptionStatuses.find((s) => s.lookupKey === "ACTIVE")?.id ??
    subscriptionStatuses[0]?.id ??
    "";

  const lastManualBillingRecipientIdRef = useRef<string>("");

  const [values, setValues] = useState<PatientFormValues>({
    nicOrPassport: initial?.nicOrPassport ?? "",
    fullName: initial?.fullName ?? "",
    shortName: initial?.shortName ?? "",
    dob: initial?.dob ?? "",
    contactNo: initial?.contactNo ?? "",
    whatsappNo: initial?.whatsappNo ?? "",
    email: initial?.email ?? "",
    genderId: initial?.genderId ?? genders[0]?.id ?? "",
    address: initial?.address ?? "",
    hasInsurance: Boolean(initial?.hasInsurance),
    hasGuardian: Boolean(initial?.hasGuardian),
    guardianName: initial?.guardianName ?? "",
    guardianEmail: initial?.guardianEmail ?? "",
    guardianWhatsappNo: initial?.guardianWhatsappNo ?? "",
    guardianContactNo: initial?.guardianContactNo ?? "",
    guardianRelationship: initial?.guardianRelationship ?? "",
    billingRecipientId: initial?.hasGuardian
      ? initial?.billingRecipientId ?? billingRecipients[0]?.id ?? ""
      : forcedPatientBillingRecipientId,
    subscriptionPlanId: initial?.subscriptionPlanId ?? "",
    subscriptionStatusId: initial?.subscriptionStatusId ?? defaultSubscriptionStatusId,
    isSubscribed: initial?.isSubscribed ?? false,
  });

  // Store last manually editable billing recipient when the form initializes.
  useEffect(() => {
    if (values.hasGuardian) {
      lastManualBillingRecipientIdRef.current = values.billingRecipientId ?? "";
    } else {
      lastManualBillingRecipientIdRef.current =
        values.billingRecipientId ?? forcedPatientBillingRecipientId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isWhatsappSameAsContact, setIsWhatsappSameAsContact] = useState(
    () =>
      Boolean(initial?.contactNo) &&
      Boolean(initial?.whatsappNo) &&
      String(initial?.contactNo).trim() === String(initial?.whatsappNo).trim(),
  );
  const [isGuardianWhatsappSameAsContact, setIsGuardianWhatsappSameAsContact] = useState(
    () =>
      Boolean(initial?.guardianContactNo) &&
      Boolean(initial?.guardianWhatsappNo) &&
      String(initial?.guardianContactNo).trim() ===
        String(initial?.guardianWhatsappNo).trim(),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasPatientContactNo = Boolean(values.contactNo?.trim());
  const hasGuardianContactNo = Boolean(values.guardianContactNo?.trim());

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
            if (values.isSubscribed && !values.subscriptionPlanId?.trim()) {
              throw new Error("Assign subscription plan is required for subscribed customers");
            }
            await onSubmit({
              nicOrPassport: values.nicOrPassport?.trim() || undefined,
              fullName: values.fullName.trim(),
              shortName: values.shortName?.trim() || undefined,
              dob: values.dob?.trim() || undefined,
              contactNo: values.contactNo?.trim() || undefined,
              whatsappNo: values.whatsappNo?.trim() || undefined,
              email: values.email?.trim() || undefined,
              genderId: values.genderId?.trim() || undefined,
              address: values.address?.trim() || undefined,
              hasInsurance: Boolean(values.hasInsurance),
              hasGuardian: Boolean(values.hasGuardian),
              guardianName: values.guardianName?.trim() || undefined,
              guardianEmail: values.guardianEmail?.trim() || undefined,
              guardianWhatsappNo: values.guardianWhatsappNo?.trim() || undefined,
              guardianContactNo: values.guardianContactNo?.trim() || undefined,
              guardianRelationship: values.guardianRelationship?.trim() || undefined,
              billingRecipientId: values.billingRecipientId?.trim() || undefined,
              subscriptionPlanId: values.isSubscribed
                ? values.subscriptionPlanId?.trim() || undefined
                : undefined,
              subscriptionStatusId:
                values.isSubscribed && !subscriptionStatusDisabled
                  ? values.subscriptionStatusId?.trim() || undefined
                  : undefined,
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
        {includeSubscriptionPlan ? (
          <>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <CheckboxBase
                checked={Boolean(values.isSubscribed)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setValues((v) => ({
                    ...v,
                    isSubscribed: checked,
                    subscriptionPlanId: checked ? v.subscriptionPlanId : "",
                    subscriptionStatusId: checked
                      ? v.subscriptionStatusId || defaultSubscriptionStatusId
                      : "",
                  }));
                }}
              />
              Is subscribed?
            </label>
            {values.isSubscribed ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[var(--text-primary)]">
                  Assign Subscription Plan
                </span>
                <SelectBase
                  className={selectClass}
                  value={values.subscriptionPlanId ?? ""}
                  required
                  onChange={(e) =>
                    setValues((v) => ({ ...v, subscriptionPlanId: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.planName}
                    </option>
                  ))}
                </SelectBase>
              </label>
            ) : null}
            {values.isSubscribed ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[var(--text-primary)]">
                  Subscription Status
                </span>
                <SelectBase
                  className={selectClass}
                  value={values.subscriptionStatusId ?? ""}
                  disabled={subscriptionStatusDisabled}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, subscriptionStatusId: e.target.value }))
                  }
                >
                  <option value="">Select</option>
                  {subscriptionStatuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.lookupValue}
                    </option>
                  ))}
                </SelectBase>
                {subscriptionStatusDisabled ? (
                  <div className="text-xs text-[var(--text-secondary)]">
                    Status is locked for shared subscription accounts.
                  </div>
                ) : null}
              </label>
            ) : null}
          </>
        ) : null}

        <Input
          label="Full name"
          name="fullName"
          value={values.fullName}
          onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
          required
        />
        <Input
          label="NIC / Passport"
          name="nicOrPassport"
          value={values.nicOrPassport ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, nicOrPassport: e.target.value }))}
        />
        <Input
          label="Short name"
          name="shortName"
          value={values.shortName ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, shortName: e.target.value }))}
        />
        <Input
          label="DOB (YYYY-MM-DD)"
          name="dob"
          value={values.dob ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, dob: e.target.value }))}
        />
        <Input
          label="Contact"
          name="contactNo"
          value={values.contactNo ?? ""}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              contactNo: e.target.value,
              ...(isWhatsappSameAsContact ? { whatsappNo: e.target.value } : {}),
            }))
          }
        />
        <label className="flex items-center gap-2 self-end pb-2 text-xs text-[var(--text-secondary)]">
          <CheckboxBase
            checked={isWhatsappSameAsContact}
            disabled={!hasPatientContactNo}
            onChange={(e) => {
              const checked = e.target.checked;
              setIsWhatsappSameAsContact(checked);
              if (checked) {
                setValues((v) => ({ ...v, whatsappNo: v.contactNo ?? "" }));
              }
            }}
          />
          Same as contact number
        </label>
        <Input
          label="Patient WhatsApp Number"
          name="whatsappNo"
          value={values.whatsappNo ?? ""}
          disabled={isWhatsappSameAsContact}
          onChange={(e) => setValues((v) => ({ ...v, whatsappNo: e.target.value }))}
        />
        <Input
          label="Email (invoice delivery)"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
        />
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Gender (Lookup)</span>
          <SelectBase
            className={selectClass}
            value={values.genderId ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, genderId: e.target.value }))}
          >
            <option value="">Select</option>
            {genders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.lookupValue}
              </option>
            ))}
          </SelectBase>
        </label>
        <Input
          label="Address"
          name="address"
          value={values.address ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          className="sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <CheckboxBase
            checked={Boolean(values.hasInsurance)}
            onChange={(e) => setValues((v) => ({ ...v, hasInsurance: e.target.checked }))}
          />
          Has insurance
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <CheckboxBase
            checked={Boolean(values.hasGuardian)}
            onChange={(e) => {
              const checked = e.target.checked;
              setValues((v) => {
                if (!checked) {
                  // Patient has no guardian -> do not allow editing billing recipient.
                  lastManualBillingRecipientIdRef.current = v.billingRecipientId ?? "";
                  return { ...v, hasGuardian: checked, billingRecipientId: forcedPatientBillingRecipientId };
                }
                // Restoring manual value when guardian is enabled again.
                return {
                  ...v,
                  hasGuardian: checked,
                  billingRecipientId:
                    lastManualBillingRecipientIdRef.current ||
                    initial?.billingRecipientId ||
                    billingRecipients[0]?.id ||
                    forcedPatientBillingRecipientId,
                };
              });
            }}
          />
          Has guardian
        </label>
        {values.hasGuardian ? (
          <>
            <Input
              label="Guardian Name"
              name="guardianName"
              value={values.guardianName ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, guardianName: e.target.value }))}
            />
            <Input
              label="Guardian Email"
              name="guardianEmail"
              type="email"
              value={values.guardianEmail ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, guardianEmail: e.target.value }))}
            />
            <Input
              label="Guardian Contact No"
              name="guardianContactNo"
              value={values.guardianContactNo ?? ""}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  guardianContactNo: e.target.value,
                  ...(isGuardianWhatsappSameAsContact
                    ? { guardianWhatsappNo: e.target.value }
                    : {}),
                }))
              }
            />
            <label className="flex items-center gap-2 self-end pb-2 text-xs text-[var(--text-secondary)]">
              <CheckboxBase
                checked={isGuardianWhatsappSameAsContact}
                disabled={!hasGuardianContactNo}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsGuardianWhatsappSameAsContact(checked);
                  if (checked) {
                    setValues((v) => ({
                      ...v,
                      guardianWhatsappNo: v.guardianContactNo ?? "",
                    }));
                  }
                }}
              />
              Same as guardian contact number
            </label>
            <Input
              label="Guardian WhatsApp Number"
              name="guardianWhatsappNo"
              value={values.guardianWhatsappNo ?? ""}
              disabled={isGuardianWhatsappSameAsContact}
              onChange={(e) =>
                setValues((v) => ({ ...v, guardianWhatsappNo: e.target.value }))
              }
            />
            <Input
              label="Guardian Relationship"
              name="guardianRelationship"
              value={values.guardianRelationship ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, guardianRelationship: e.target.value }))
              }
            />
          </>
        ) : null}
        {values.hasGuardian ? (
          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--text-primary)]">Billing Recipient</span>
            <SelectBase
              className={selectClass}
              value={values.billingRecipientId ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, billingRecipientId: e.target.value }))}
            >
              <option value="">Select</option>
              {billingRecipients.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.lookupValue}
                </option>
              ))}
            </SelectBase>
          </label>
        ) : null}
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

