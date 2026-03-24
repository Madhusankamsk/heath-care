"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
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
  patientTypeId?: string | null;
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
  patientTypeLookup?: { id: string; lookupValue: string } | null;
  billingRecipientLookup?: { id: string; lookupValue: string } | null;
};

type PatientManagerProps = {
  initialPatients: Patient[];
  genders: LookupOption[];
  patientTypes: LookupOption[];
  billingRecipients: LookupOption[];
  subscriptionPlans: SubscriptionPlanOption[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  openCreateOnMount?: boolean;
};
type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type SubscriptionPlanOption = { id: string; planName: string };

type Mode = "none" | "create" | "edit" | "preview";

export function PatientManager({
  initialPatients,
  genders,
  patientTypes,
  billingRecipients,
  subscriptionPlans,
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
    mode === "create" && canCreate,
  );

  async function refresh() {
    const res = await fetch("/api/patients", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh patient list");
    const next = (await res.json()) as Patient[];
    setPatients(next);
  }

  async function handleDelete(id: string) {
    setError(null);
    if (!window.confirm("Delete this patient?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/patients/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to delete patient or not allowed");
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
          Manage patients (create, edit, delete, preview).
        </div>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Button
              variant="primary"
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
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong");
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
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
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
                    Register patient demographics, guardian details, and optional plan assignment.
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
                title="Create patient"
                submitLabel="Create"
                genders={genders}
                patientTypes={patientTypes}
                billingRecipients={billingRecipients}
                subscriptionPlans={subscriptionPlans}
                includeSubscriptionPlan
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
                  if (!res.ok) {
                    const msg = await res.text().catch(() => "");
                    throw new Error(msg || "Create failed");
                  }
                  await refresh();
                  setMode("none");
                }}
              />
            </Card>
          </div>
        </div>
      ) : null}

      {mode === "edit" && selected ? (
        <PatientForm
          layout="card"
          title="Edit patient"
          submitLabel="Save changes"
          genders={genders}
          patientTypes={patientTypes}
          billingRecipients={billingRecipients}
          subscriptionPlans={subscriptionPlans}
          initial={{
            nicOrPassport: selected.nicOrPassport ?? "",
            fullName: selected.fullName,
            shortName: selected.shortName ?? "",
            dob: selected.dob ? String(selected.dob) : "",
            contactNo: selected.contactNo ?? "",
            whatsappNo: selected.whatsappNo ?? "",
            genderId: selected.genderId ?? "",
            patientTypeId: selected.patientTypeId ?? "",
            address: selected.address ?? "",
            hasInsurance: Boolean(selected.hasInsurance),
            hasGuardian: Boolean(selected.hasGuardian),
            guardianName: selected.guardianName ?? "",
            guardianEmail: selected.guardianEmail ?? "",
            guardianWhatsappNo: selected.guardianWhatsappNo ?? "",
            guardianContactNo: selected.guardianContactNo ?? "",
            guardianRelationship: selected.guardianRelationship ?? "",
            billingRecipientId: selected.billingRecipientId ?? "",
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
          }}
        />
      ) : null}

      {mode === "preview" && selected ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4">
            <div className="text-lg font-semibold">Preview patient</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Read-only details.</div>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Name</dt>
              <dd className="font-medium">{selected.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                NIC/Passport
              </dt>
              <dd className="font-medium">{selected.nicOrPassport ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">DOB</dt>
              <dd className="font-medium">
                {selected.dob ? String(selected.dob) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Contact</dt>
              <dd className="font-medium">{selected.contactNo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                Patient WhatsApp
              </dt>
              <dd className="font-medium">{selected.whatsappNo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Gender</dt>
              <dd className="font-medium">
                {selected.genderLookup?.lookupValue ?? selected.gender ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Patient Type</dt>
              <dd className="font-medium">{selected.patientTypeLookup?.lookupValue ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Address</dt>
              <dd className="font-medium">{selected.address ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Has Insurance</dt>
              <dd className="font-medium">{selected.hasInsurance ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Has Guardian</dt>
              <dd className="font-medium">{selected.hasGuardian ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Guardian Name</dt>
              <dd className="font-medium">{selected.guardianName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Guardian Email</dt>
              <dd className="font-medium">{selected.guardianEmail ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                Guardian WhatsApp
              </dt>
              <dd className="font-medium">{selected.guardianWhatsappNo ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-zinc-500 dark:text-zinc-400">Billing Recipient</dt>
              <dd className="font-medium">
                {selected.billingRecipientLookup?.lookupValue ?? "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-end">
            <Button variant="secondary" onClick={() => setMode("none")}>
              Close
            </Button>
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
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="ghost"
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
                          variant="ghost"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(p.id);
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
                          onClick={() => handleDelete(p.id)}
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
  nicOrPassport?: string;
  fullName: string;
  shortName?: string;
  dob?: string;
  contactNo?: string;
  whatsappNo?: string;
  genderId?: string;
  patientTypeId?: string;
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
};

function PatientForm({
  title,
  submitLabel,
  genders,
  patientTypes,
  billingRecipients,
  subscriptionPlans,
  includeSubscriptionPlan,
  onCancel,
  onSubmit,
  initial,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  genders: LookupOption[];
  patientTypes: LookupOption[];
  billingRecipients: LookupOption[];
  subscriptionPlans: SubscriptionPlanOption[];
  includeSubscriptionPlan?: boolean;
  onCancel: () => void;
  onSubmit: (values: PatientFormValues) => Promise<void>;
  initial?: Partial<PatientFormValues>;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<PatientFormValues>({
    nicOrPassport: initial?.nicOrPassport ?? "",
    fullName: initial?.fullName ?? "",
    shortName: initial?.shortName ?? "",
    dob: initial?.dob ?? "",
    contactNo: initial?.contactNo ?? "",
    whatsappNo: initial?.whatsappNo ?? "",
    genderId: initial?.genderId ?? genders[0]?.id ?? "",
    patientTypeId: initial?.patientTypeId ?? patientTypes[0]?.id ?? "",
    address: initial?.address ?? "",
    hasInsurance: Boolean(initial?.hasInsurance),
    hasGuardian: Boolean(initial?.hasGuardian),
    guardianName: initial?.guardianName ?? "",
    guardianEmail: initial?.guardianEmail ?? "",
    guardianWhatsappNo: initial?.guardianWhatsappNo ?? "",
    guardianContactNo: initial?.guardianContactNo ?? "",
    guardianRelationship: initial?.guardianRelationship ?? "",
    billingRecipientId: initial?.billingRecipientId ?? billingRecipients[0]?.id ?? "",
    subscriptionPlanId: initial?.subscriptionPlanId ?? "",
  });
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
            await onSubmit({
              nicOrPassport: values.nicOrPassport?.trim() || undefined,
              fullName: values.fullName.trim(),
              shortName: values.shortName?.trim() || undefined,
              dob: values.dob?.trim() || undefined,
              contactNo: values.contactNo?.trim() || undefined,
              whatsappNo: values.whatsappNo?.trim() || undefined,
              genderId: values.genderId?.trim() || undefined,
              patientTypeId: values.patientTypeId?.trim() || undefined,
              address: values.address?.trim() || undefined,
              hasInsurance: Boolean(values.hasInsurance),
              hasGuardian: Boolean(values.hasGuardian),
              guardianName: values.guardianName?.trim() || undefined,
              guardianEmail: values.guardianEmail?.trim() || undefined,
              guardianWhatsappNo: values.guardianWhatsappNo?.trim() || undefined,
              guardianContactNo: values.guardianContactNo?.trim() || undefined,
              guardianRelationship: values.guardianRelationship?.trim() || undefined,
              billingRecipientId: values.billingRecipientId?.trim() || undefined,
              subscriptionPlanId: values.subscriptionPlanId?.trim() || undefined,
            });
          } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong");
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
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Patient Type</span>
          <select
            className={selectClass}
            value={values.patientTypeId ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, patientTypeId: e.target.value }))}
          >
            <option value="">Select</option>
            {patientTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.lookupValue}
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
            onChange={(e) => setValues((v) => ({ ...v, hasGuardian: e.target.checked }))}
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
        {includeSubscriptionPlan ? (
          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="font-medium text-[var(--text-primary)]">
              Assign Subscription Plan (optional)
            </span>
            <select
              className={selectClass}
              value={values.subscriptionPlanId ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, subscriptionPlanId: e.target.value }))}
            >
              <option value="">No plan</option>
              {subscriptionPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.planName}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
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

