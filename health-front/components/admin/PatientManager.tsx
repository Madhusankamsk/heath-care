"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { openInvoicePdf } from "@/lib/openInvoicePdf";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";

export type Patient = {
  id: string;
  nicOrPassport?: string | null;
  fullName: string;
  shortName?: string | null;
  dob?: string | Date | null;
  contactNo?: string | null;
  whatsappNo?: string | null;
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
  genders: LookupOption[];
  billingRecipients: LookupOption[];
  subscriptionPlans: SubscriptionPlanOption[];
  subscriptionStatuses: LookupOption[];
  paymentMethods: LookupOption[];
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
  genders,
  billingRecipients,
  subscriptionPlans,
  subscriptionStatuses,
  paymentMethods,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
  openCreateOnMount = false,
}: PatientManagerProps) {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);
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

  async function refresh() {
    const res = await fetch("/api/patients", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh patient list");
    const next = (await res.json()) as Patient[];
    setPatients(next);
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage patients (create, edit, delete, preview).
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
        </div>
      </div>

      {mode === "create" && canCreate ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-patient-title"
          onClick={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="create-patient-title"
                    className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                  >
                    Create patient
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Register patient demographics, guardian details, and plan assignment when subscribed.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    setMode("none");
                    setError(null);
                  }}
                >
                  ×
                </button>
              </div>
              <PatientForm
                layout="modal"
                intent="create"
                title="Create patient"
                submitLabel="Create"
                genders={genders}
                billingRecipients={billingRecipients}
                subscriptionPlans={subscriptionPlans}
                subscriptionStatuses={subscriptionStatuses}
                paymentMethods={paymentMethods}
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
                  if (invoiceId) openInvoicePdf(invoiceId);
                }}
              />
            </Card>
          </div>
        </div>
      ) : null}

      {mode === "edit" && selected ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-patient-title"
          onClick={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="edit-patient-title"
                    className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                  >
                    Edit patient
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Update patient demographics, guardian details, and plan assignment.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  onClick={() => {
                    setMode("none");
                    setError(null);
                  }}
                >
                  ×
                </button>
              </div>
              <PatientForm
                layout="modal"
                intent="edit"
                title="Edit patient"
                submitLabel="Save changes"
                genders={genders}
                billingRecipients={billingRecipients}
                subscriptionPlans={subscriptionPlans}
                subscriptionStatuses={subscriptionStatuses}
                paymentMethods={paymentMethods}
                includeSubscriptionPlan
                subscriptionStatusDisabled={Boolean(selected.isSubscriptionAccountShared)}
                initial={{
                  nicOrPassport: selected.nicOrPassport ?? "",
                  fullName: selected.fullName,
                  shortName: selected.shortName ?? "",
                  dob: selected.dob ? String(selected.dob) : "",
                  contactNo: selected.contactNo ?? "",
                  whatsappNo: selected.whatsappNo ?? "",
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
            </Card>
          </div>
        </div>
      ) : null}

      {mode === "preview" && selected ? (
        <div
          className="fixed inset-0 z-70 flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-patient-title"
          onClick={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="preview-patient-title"
                    className="text-lg font-semibold tracking-tight text-[var(--text-primary)]"
                  >
                    Preview patient
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">Read-only details.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 px-3"
                    onClick={() => {
                      router.push(`/dashboard/clients/patient/${selected.id}`);
                    }}
                  >
                    Full Preview
                  </Button>
                  <button
                    type="button"
                    aria-label="Close"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                    onClick={() => {
                      setMode("none");
                      setError(null);
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="preview-shell sm:grid-cols-2">
                <section className="preview-section">
                  <h3 className="preview-section-title">Identity</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Name</dt>
                      <dd className="preview-value">{selected.fullName}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">NIC/Passport</dt>
                      <dd className="preview-value">{selected.nicOrPassport ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">DOB</dt>
                      <dd className="preview-value">{selected.dob ? String(selected.dob) : "—"}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Contact</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Contact</dt>
                      <dd className="preview-value">{selected.contactNo ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Patient WhatsApp</dt>
                      <dd className="preview-value">{selected.whatsappNo ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Address</dt>
                      <dd className="preview-value">{selected.address ?? "—"}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Demographics</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Gender</dt>
                      <dd className="preview-value">
                        {selected.genderLookup?.lookupValue ?? selected.gender ?? "—"}
                      </dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Billing Recipient</dt>
                      <dd className="preview-value">{selected.billingRecipientLookup?.lookupValue ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Subscribed</dt>
                      <dd className="preview-value">{selected.isSubscribed ? "Yes" : "No"}</dd>
                    </div>
                    {selected.isSubscribed ? (
                      <div className="preview-row">
                        <dt className="preview-label">Subscription Plan</dt>
                        <dd className="preview-value">{selected.subscriptionPlanName ?? "—"}</dd>
                      </div>
                    ) : null}
                    {selected.isSubscribed ? (
                      <div className="preview-row">
                        <dt className="preview-label">Subscription Status</dt>
                        <dd className="preview-value">{selected.subscriptionStatusName ?? "—"}</dd>
                      </div>
                    ) : null}
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Guardian & Coverage</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Has Insurance</dt>
                      <dd className="preview-value">{selected.hasInsurance ? "Yes" : "No"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Has Guardian</dt>
                      <dd className="preview-value">{selected.hasGuardian ? "Yes" : "No"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Guardian Name</dt>
                      <dd className="preview-value">{selected.guardianName ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Guardian Email</dt>
                      <dd className="preview-value">{selected.guardianEmail ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Guardian WhatsApp</dt>
                      <dd className="preview-value">{selected.guardianWhatsappNo ?? "—"}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">NIC/Passport</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => {
              const isBusy = busyId === p.id;
              return (
                <tr key={p.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{p.fullName}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.nicOrPassport ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.contactNo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.genderLookup?.lookupValue ?? p.gender ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.isSubscribed ? p.subscriptionStatusName ?? "—" : "Not subscribed"}
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

type PatientFormValues = {
  isSubscribed?: boolean;
  nicOrPassport?: string;
  fullName: string;
  shortName?: string;
  dob?: string;
  contactNo?: string;
  whatsappNo?: string;
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
  payments?: Array<{
    amountPaid: number;
    paymentMethodId: string;
    transactionRef?: string;
  }>;
};

type PatientPaymentRow = { amount: string; paymentMethodId: string; transactionRef: string };

function PatientForm({
  title,
  submitLabel,
  intent,
  genders,
  billingRecipients,
  subscriptionPlans,
  subscriptionStatuses,
  paymentMethods,
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
  paymentMethods?: LookupOption[];
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
  const [paymentRows, setPaymentRows] = useState<PatientPaymentRow[]>([]);
  const hasPatientContactNo = Boolean(values.contactNo?.trim());
  const hasGuardianContactNo = Boolean(values.guardianContactNo?.trim());

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
            if (values.isSubscribed && !values.subscriptionPlanId?.trim()) {
              throw new Error("Assign subscription plan is required for subscribed customers");
            }
            const builtPayments: PatientFormValues["payments"] = [];
            if (
              intent === "create" &&
              values.isSubscribed &&
              paymentMethods &&
              paymentMethods.length > 0
            ) {
              for (const row of paymentRows) {
                const amtStr = row.amount.trim();
                const mid = row.paymentMethodId.trim();
                if (!amtStr && !mid && !row.transactionRef.trim()) continue;
                if (!amtStr || !mid) {
                  throw new Error("Each payment line needs an amount and a payment method.");
                }
                const n = Number(amtStr);
                if (!Number.isFinite(n) || n <= 0) {
                  throw new Error("Payment amounts must be positive numbers.");
                }
                builtPayments.push({
                  amountPaid: n,
                  paymentMethodId: mid,
                  transactionRef: row.transactionRef.trim() || undefined,
                });
              }
            }
            await onSubmit({
              nicOrPassport: values.nicOrPassport?.trim() || undefined,
              fullName: values.fullName.trim(),
              shortName: values.shortName?.trim() || undefined,
              dob: values.dob?.trim() || undefined,
              contactNo: values.contactNo?.trim() || undefined,
              whatsappNo: values.whatsappNo?.trim() || undefined,
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
              payments: builtPayments.length > 0 ? builtPayments : undefined,
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
              <input
                type="checkbox"
                checked={Boolean(values.isSubscribed)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (!checked) setPaymentRows([]);
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
                <select
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
                </select>
              </label>
            ) : null}
            {values.isSubscribed ? (
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-[var(--text-primary)]">
                  Subscription Status
                </span>
                <select
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
                </select>
                {subscriptionStatusDisabled ? (
                  <div className="text-xs text-[var(--text-secondary)]">
                    Status is locked for shared subscription accounts.
                  </div>
                ) : null}
              </label>
            ) : null}
            {intent === "create" &&
            includeSubscriptionPlan &&
            paymentMethods &&
            paymentMethods.length > 0 &&
            values.isSubscribed ? (
              <div className="flex flex-col gap-3 sm:col-span-2">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  Subscription payments at registration (optional)
                </div>
                {paymentRows.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:grid-cols-3"
                  >
                    <Input
                      label="Amount"
                      name={`sub-pay-amt-${idx}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.amount}
                      onChange={(e) =>
                        setPaymentRows((rows) =>
                          rows.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r)),
                        )
                      }
                    />
                    <label className="flex flex-col gap-2 text-sm">
                      <span className="font-medium text-[var(--text-primary)]">Method</span>
                      <select
                        className={selectClass}
                        value={row.paymentMethodId}
                        onChange={(e) =>
                          setPaymentRows((rows) =>
                            rows.map((r, i) =>
                              i === idx ? { ...r, paymentMethodId: e.target.value } : r,
                            ),
                          )
                        }
                      >
                        <option value="">Select</option>
                        {paymentMethods.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.lookupValue}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input
                      label="Reference (optional)"
                      name={`sub-pay-ref-${idx}`}
                      value={row.transactionRef}
                      onChange={(e) =>
                        setPaymentRows((rows) =>
                          rows.map((r, i) =>
                            i === idx ? { ...r, transactionRef: e.target.value } : r,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  className="self-start"
                  onClick={() =>
                    setPaymentRows((rows) => [
                      ...rows,
                      { amount: "", paymentMethodId: "", transactionRef: "" },
                    ])
                  }
                >
                  Add payment line
                </Button>
              </div>
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
          <input
            type="checkbox"
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
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Gender (Lookup)</span>
          <select
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
          </select>
        </label>
        <Input
          label="Address"
          name="address"
          value={values.address ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          className="sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(values.hasInsurance)}
            onChange={(e) => setValues((v) => ({ ...v, hasInsurance: e.target.checked }))}
          />
          Has insurance
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
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
              <input
                type="checkbox"
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
            <select
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
            </select>
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

