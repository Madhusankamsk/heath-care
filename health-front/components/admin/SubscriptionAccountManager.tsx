"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Input } from "@/components/ui/Input";
import { openInvoicePdf } from "@/lib/openInvoicePdf";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";

import type { Patient } from "@/components/admin/PatientManager";

type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type PlanOption = { id: string; planName: string; isActive?: boolean };

export type SubscriptionAccount = {
  id: string;
  accountName?: string | null;
  registrationNo?: string | null;
  billingAddress?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNo?: string | null;
  planId: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  statusId?: string | null;
  plan?: { id: string; planName: string; maxMembers?: number } | null;
  statusLookup?: { id: string; lookupValue: string } | null;
  members?: Array<{
    id: string;
    joinedAt?: string | Date;
    patient?: {
      id: string;
      fullName: string;
      nicOrPassport?: string | null;
      contactNo?: string | null;
    } | null;
  }>;
};

type SubscriptionAccountManagerProps = {
  initialAccounts: SubscriptionAccount[];
  plans: PlanOption[];
  patients: Patient[];
  genders: LookupOption[];
  billingRecipients: LookupOption[];
  statuses: LookupOption[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview" | "addMember";
type ActionConfirm = null | { type: "edit" | "delete"; id: string };

type AddMemberPatientPayload = {
  fullName: string;
  shortName?: string | null;
  dob?: string | null;
  contactNo?: string | null;
  whatsappNo?: string | null;
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
};

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
  genders,
  billingRecipients,
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
  const router = useRouter();
  const [memberNicOrPassport, setMemberNicOrPassport] = useState("");
  const [matchedPatient, setMatchedPatient] = useState<Patient | null>(null);
  const [memberPatientValues, setMemberPatientValues] = useState<AddMemberPatientPayload>({
    fullName: "",
    shortName: "",
    contactNo: "",
    whatsappNo: "",
    dob: "",
    genderId: "",
    address: "",
    hasInsurance: false,
    hasGuardian: false,
    guardianName: "",
    guardianEmail: "",
    guardianWhatsappNo: "",
    guardianContactNo: "",
    guardianRelationship: "",
    billingRecipientId: "",
  });
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isMemberSubmitting, setIsMemberSubmitting] = useState(false);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return accounts.find((a) => a.id === selectedId) ?? null;
  }, [accounts, selectedId]);

  const canManageMembers = canCreate || canEdit;
  const forcedPatientBillingRecipientId =
    billingRecipients.find((br) => br.lookupKey === "PATIENT")?.id ??
    billingRecipients[0]?.id ??
    "";
  const lastManualBillingRecipientIdRef = useRef<string>("");
  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
      setMemberError(null);
    },
    (mode === "create" && canCreate) ||
      (mode === "edit" && canEdit) ||
      mode === "preview" ||
      (mode === "addMember" && canManageMembers),
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

  function openAddMemberModal(accountId: string) {
    setSelectedId(accountId);
    setMode("addMember");
    setError(null);
    setMemberError(null);
    setMatchedPatient(null);
    setMemberNicOrPassport("");
    setMemberPatientValues({
      fullName: "",
      shortName: "",
      genderId: genders[0]?.id ?? "",
      contactNo: "",
      whatsappNo: "",
      dob: "",
      address: "",
      hasInsurance: false,
      hasGuardian: false,
      guardianName: "",
      guardianEmail: "",
      guardianWhatsappNo: "",
      guardianContactNo: "",
      guardianRelationship: "",
      billingRecipientId: forcedPatientBillingRecipientId,
    });
  }

  function findPatientByNic(nicOrPassport: string) {
    const normalized = nicOrPassport.trim().toLowerCase();
    if (!normalized) return null;
    return (
      patients.find((p) => String(p.nicOrPassport ?? "").trim().toLowerCase() === normalized) ?? null
    );
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
            statuses={statuses}
            onCancel={() => setMode("none")}
            onSubmit={async (values) => {
              const res = await fetch("/api/subscription-accounts", {
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
              toast.success("Subscription account created");
              if (invoiceId) openInvoicePdf(invoiceId);
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
            statuses={statuses}
            initial={{
              accountName: selected.accountName ?? "",
              registrationNo: selected.registrationNo ?? "",
              billingAddress: selected.billingAddress ?? "",
              contactEmail: selected.contactEmail ?? "",
              contactPhone: selected.contactPhone ?? "",
              whatsappNo: selected.whatsappNo ?? "",
              planId: selected.planId,
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
          <div className="mb-4 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              className="h-9 px-3"
              onClick={() => {
                router.push(`/dashboard/clients/family-corporate/${selected.id}`);
              }}
            >
              Full Preview
            </Button>
          </div>
          <div className="preview-shell sm:grid-cols-2">
            <section className="preview-section">
              <h3 className="preview-section-title">Account</h3>
              <dl className="preview-list">
                <div className="preview-row">
                  <dt className="preview-label">Account Name</dt>
                  <dd className="preview-value">{selected.accountName ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Registration No</dt>
                  <dd className="preview-value">{selected.registrationNo ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Billing Address</dt>
                  <dd className="preview-value">{selected.billingAddress ?? "—"}</dd>
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
                  <dt className="preview-label">Members</dt>
                  <dd className="preview-value">{selected.members?.length ?? 0}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Contact Email</dt>
                  <dd className="preview-value">{selected.contactEmail ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">Contact Phone</dt>
                  <dd className="preview-value">{selected.contactPhone ?? "—"}</dd>
                </div>
                <div className="preview-row">
                  <dt className="preview-label">WhatsApp No</dt>
                  <dd className="preview-value">{selected.whatsappNo ?? "—"}</dd>
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

      {mode === "addMember" && selected && canManageMembers ? (
        <ModalShell
          titleId="add-subscription-member-title"
          title="Add member"
          subtitle="Search by NIC/Passport first. Assign existing patient or create a new record."
          onClose={() => {
            setMode("none");
            setMemberError(null);
          }}
        >
          <div className="grid gap-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <div className="text-[var(--text-secondary)]">Account</div>
                  <div className="font-medium text-[var(--text-primary)]">{selected.accountName ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">Plan</div>
                  <div className="font-medium text-[var(--text-primary)]">{selected.plan?.planName ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">Status</div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {selected.statusLookup?.lookupValue ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[var(--text-secondary)]">Members</div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {selected.members?.length ?? 0}
                    {selected.plan?.maxMembers ? ` / ${selected.plan.maxMembers}` : ""}
                  </div>
                </div>
              </div>
            </div>

            {memberError ? (
              <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
                {memberError}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Input
                label="NIC / Passport"
                name="memberNicOrPassport"
                value={memberNicOrPassport}
                onChange={(e) => {
                  const nextNic = e.target.value;
                  setMemberNicOrPassport(nextNic);
                  setMatchedPatient(findPatientByNic(nextNic));
                  setMemberError(null);
                }}
                required
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const nic = memberNicOrPassport.trim();
                  if (!nic) {
                    setMemberError("NIC/Passport is required");
                    setMatchedPatient(null);
                    return;
                  }
                  const found = findPatientByNic(nic);
                  setMatchedPatient(found);
                  setMemberError(null);
                }}
              >
                Check patient
              </Button>
            </div>

            {matchedPatient ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm">
                <div className="mb-2 text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  Existing patient found
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="font-medium text-[var(--text-primary)]">
                      {matchedPatient.fullName}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      NIC/Passport: {matchedPatient.nicOrPassport ?? "—"}
                    </div>
                  </div>
                  <div className="sm:justify-self-end">
                    <div className="text-[var(--text-secondary)]">
                      Gender: {matchedPatient.genderLookup?.lookupValue ?? matchedPatient.gender ?? "—"}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      DOB: {matchedPatient.dob ? String(matchedPatient.dob) : "—"}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-[var(--text-secondary)]">
                      Contact: {matchedPatient.contactNo ?? "—"} | WhatsApp:{" "}
                      {matchedPatient.whatsappNo ?? "—"}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      Address: {matchedPatient.address ?? "—"}
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <div className="text-[var(--text-secondary)]">
                      Insurance: {matchedPatient.hasInsurance ? "Yes" : "No"} | Guardian:{" "}
                      {matchedPatient.hasGuardian ? "Yes" : "No"}
                    </div>
                    {matchedPatient.hasGuardian ? (
                      <div className="text-[var(--text-secondary)]">
                        Guardian: {matchedPatient.guardianName ?? "—"} ({matchedPatient.guardianRelationship ?? "—"})
                        {" "} | Contact: {matchedPatient.guardianContactNo ?? "—"} | WhatsApp:{" "}
                        {matchedPatient.guardianWhatsappNo ?? "—"}
                      </div>
                    ) : null}
                    <div className="text-[var(--text-secondary)]">
                      Billing Recipient:{" "}
                      {matchedPatient.billingRecipientLookup?.lookupValue ?? "—"}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      Subscribed: {matchedPatient.isSubscribed ? "Yes" : "No"}
                    </div>
                    {matchedPatient.isSubscribed ? (
                      <div className="text-[var(--text-secondary)]">
                        Subscription Plan: {matchedPatient.subscriptionPlanName ?? "—"}
                      </div>
                    ) : null}
                    {matchedPatient.isSubscribed ? (
                      <div className="text-[var(--text-secondary)]">
                        Subscription Status: {matchedPatient.subscriptionStatusName ?? "—"}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : memberNicOrPassport.trim() ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Short name"
                  name="shortName"
                  value={memberPatientValues.shortName ?? ""}
                  onChange={(e) =>
                    setMemberPatientValues((v) => ({ ...v, shortName: e.target.value }))
                  }
                />
                <Input
                  label="Full name"
                  name="fullName"
                  value={memberPatientValues.fullName}
                  onChange={(e) =>
                    setMemberPatientValues((v) => ({ ...v, fullName: e.target.value }))
                  }
                  required
                />
                <Input
                  label="DOB (YYYY-MM-DD)"
                  name="dob"
                  value={memberPatientValues.dob ?? ""}
                  onChange={(e) =>
                    setMemberPatientValues((v) => ({ ...v, dob: e.target.value }))
                  }
                />
                <label className="flex flex-col gap-2 text-sm">
                  <span className="font-medium text-[var(--text-primary)]">Gender</span>
                  <select
                    className={selectClass}
                    value={memberPatientValues.genderId ?? ""}
                    onChange={(e) =>
                      setMemberPatientValues((v) => ({ ...v, genderId: e.target.value }))
                    }
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
                  label="Contact"
                  name="contactNo"
                  value={memberPatientValues.contactNo ?? ""}
                  onChange={(e) =>
                    setMemberPatientValues((v) => ({ ...v, contactNo: e.target.value }))
                  }
                />
                <Input
                  label="WhatsApp"
                  name="whatsappNo"
                  value={memberPatientValues.whatsappNo ?? ""}
                  onChange={(e) =>
                    setMemberPatientValues((v) => ({ ...v, whatsappNo: e.target.value }))
                  }
                />

                <div className="sm:col-span-2">
                  <Input
                    label="Address"
                    name="address"
                    value={memberPatientValues.address ?? ""}
                    onChange={(e) =>
                      setMemberPatientValues((v) => ({ ...v, address: e.target.value }))
                    }
                  />
                </div>

                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(memberPatientValues.hasInsurance)}
                    onChange={(e) =>
                      setMemberPatientValues((v) => ({
                        ...v,
                        hasInsurance: e.target.checked,
                      }))
                    }
                  />
                  Has insurance
                </label>

                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={Boolean(memberPatientValues.hasGuardian)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setMemberPatientValues((v) => {
                        if (!checked) {
                          // When guardian is disabled, billing recipient is effectively forced.
                          lastManualBillingRecipientIdRef.current = v.billingRecipientId ?? "";
                          return {
                            ...v,
                            hasGuardian: checked,
                            billingRecipientId: forcedPatientBillingRecipientId,
                          };
                        }
                        return {
                          ...v,
                          hasGuardian: checked,
                          billingRecipientId:
                            lastManualBillingRecipientIdRef.current ||
                            forcedPatientBillingRecipientId ||
                            billingRecipients[0]?.id ||
                            "",
                        };
                      });
                    }}
                  />
                  Has guardian
                </label>

                {memberPatientValues.hasGuardian ? (
                  <>
                    <Input
                      label="Guardian Name"
                      name="guardianName"
                      value={memberPatientValues.guardianName ?? ""}
                      onChange={(e) =>
                        setMemberPatientValues((v) => ({
                          ...v,
                          guardianName: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Guardian Email"
                      name="guardianEmail"
                      type="email"
                      value={memberPatientValues.guardianEmail ?? ""}
                      onChange={(e) =>
                        setMemberPatientValues((v) => ({
                          ...v,
                          guardianEmail: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Guardian Contact No"
                      name="guardianContactNo"
                      value={memberPatientValues.guardianContactNo ?? ""}
                      onChange={(e) =>
                        setMemberPatientValues((v) => ({
                          ...v,
                          guardianContactNo: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Guardian WhatsApp Number"
                      name="guardianWhatsappNo"
                      value={memberPatientValues.guardianWhatsappNo ?? ""}
                      onChange={(e) =>
                        setMemberPatientValues((v) => ({
                          ...v,
                          guardianWhatsappNo: e.target.value,
                        }))
                      }
                    />
                    <Input
                      label="Guardian Relationship"
                      name="guardianRelationship"
                      value={memberPatientValues.guardianRelationship ?? ""}
                      onChange={(e) =>
                        setMemberPatientValues((v) => ({
                          ...v,
                          guardianRelationship: e.target.value,
                        }))
                      }
                    />
                    <label className="flex flex-col gap-2 text-sm sm:col-span-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        Billing Recipient
                      </span>
                      <select
                        className={selectClass}
                        value={memberPatientValues.billingRecipientId ?? ""}
                        onChange={(e) =>
                          setMemberPatientValues((v) => ({
                            ...v,
                            billingRecipientId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Select</option>
                        {billingRecipients.map((br) => (
                          <option key={br.id} value={br.id}>
                            {br.lookupValue}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : null}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMode("none");
                  setMemberError(null);
                }}
                disabled={isMemberSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="create"
                isLoading={isMemberSubmitting}
                onClick={async () => {
                  const nic = memberNicOrPassport.trim();
                  if (!nic) {
                    setMemberError("NIC/Passport is required");
                    return;
                  }
                  if (!matchedPatient && !memberPatientValues.fullName.trim()) {
                    setMemberError("Full name is required for new patient");
                    return;
                  }

                  setMemberError(null);
                  setIsMemberSubmitting(true);
                  try {
                    const patientToAssign = matchedPatient ?? findPatientByNic(nic);
                    const payload = patientToAssign
                      ? { nicOrPassport: nic }
                      : {
                          nicOrPassport: nic,
                          patient: {
                            fullName: memberPatientValues.fullName.trim(),
                            shortName:
                              memberPatientValues.shortName?.trim() || undefined,
                            contactNo:
                              memberPatientValues.contactNo?.trim() || undefined,
                            whatsappNo:
                              memberPatientValues.whatsappNo?.trim() || undefined,
                            dob: memberPatientValues.dob?.trim() || undefined,
                            genderId:
                              memberPatientValues.genderId?.trim() || undefined,
                            address:
                              memberPatientValues.address?.trim() || undefined,
                            hasInsurance: Boolean(memberPatientValues.hasInsurance),
                            hasGuardian: Boolean(memberPatientValues.hasGuardian),
                            guardianName:
                              memberPatientValues.guardianName?.trim() || undefined,
                            guardianEmail:
                              memberPatientValues.guardianEmail?.trim() || undefined,
                            guardianWhatsappNo:
                              memberPatientValues.guardianWhatsappNo?.trim() || undefined,
                            guardianContactNo:
                              memberPatientValues.guardianContactNo?.trim() || undefined,
                            guardianRelationship:
                              memberPatientValues.guardianRelationship?.trim() || undefined,
                            billingRecipientId:
                              memberPatientValues.billingRecipientId?.trim() || undefined,
                          },
                        };
                    const res = await fetch(`/api/subscription-accounts/${selected.id}/members`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    if (!res.ok) {
                      const msg = await res.text().catch(() => "");
                      throw new Error(msg || "Failed to add member");
                    }
                    await refresh();
                    setMode("none");
                    toast.success(
                      patientToAssign
                        ? "Member assigned"
                        : "Patient created and assigned",
                    );
                  } catch (e) {
                    const msg = e instanceof Error ? e.message : "Something went wrong";
                    setMemberError(msg);
                    toast.error(msg);
                  } finally {
                    setIsMemberSubmitting(false);
                  }
                }}
              >
                {matchedPatient ? "Assign member" : "Create & assign member"}
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((row) => {
              const isBusy = busyId === row.id;
              const membersCount = row.members?.length ?? 0;
              const maxMembers = row.plan?.maxMembers;
              return (
                <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{row.accountName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.plan?.planName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {typeof maxMembers === "number" ? `${membersCount}/${maxMembers}` : membersCount}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {row.statusLookup?.lookupValue ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canManageMembers ? (
                        <Button
                          type="button"
                          variant="create"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => openAddMemberModal(row.id)}
                        >
                          Add member
                        </Button>
                      ) : null}
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
  registrationNo?: string;
  billingAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNo?: string;
  planId: string;
  startDate?: string;
  endDate?: string;
  statusId?: string;
};

function SubscriptionAccountForm({
  intent,
  title,
  submitLabel,
  plans,
  statuses,
  initial,
  onCancel,
  onSubmit,
}: {
  intent: "create" | "edit";
  title: string;
  submitLabel: string;
  plans: PlanOption[];
  statuses: LookupOption[];
  initial?: Partial<FormValues>;
  onCancel: () => void;
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>({
    accountName: initial?.accountName ?? "",
    registrationNo: initial?.registrationNo ?? "",
    billingAddress: initial?.billingAddress ?? "",
    contactEmail: initial?.contactEmail ?? "",
    contactPhone: initial?.contactPhone ?? "",
    whatsappNo: initial?.whatsappNo ?? "",
    planId: initial?.planId ?? plans[0]?.id ?? "",
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
            if (!values.planId.trim()) {
              throw new Error("Plan is required");
            }

            await onSubmit({
              accountName: values.accountName?.trim() || undefined,
              registrationNo: values.registrationNo?.trim() || undefined,
              billingAddress: values.billingAddress?.trim() || undefined,
              contactEmail: values.contactEmail?.trim() || undefined,
              contactPhone: values.contactPhone?.trim() || undefined,
              whatsappNo: values.whatsappNo?.trim() || undefined,
              planId: values.planId.trim(),
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
        <Input
          label="Registration No"
          name="registrationNo"
          value={values.registrationNo ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, registrationNo: e.target.value }))}
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
        <Input
          label="Contact Email"
          name="contactEmail"
          value={values.contactEmail ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value }))}
        />
        <Input
          label="Start Date"
          name="startDate"
          type="date"
          value={values.startDate ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, startDate: e.target.value }))}
        />
        <Input
          label="Contact Phone"
          name="contactPhone"
          value={values.contactPhone ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, contactPhone: e.target.value }))}
        />
        <Input
          label="End Date"
          name="endDate"
          type="date"
          value={values.endDate ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, endDate: e.target.value }))}
        />
        <Input
          label="WhatsApp No"
          name="whatsappNo"
          value={values.whatsappNo ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, whatsappNo: e.target.value }))}
        />
        <div className="sm:col-span-2">
          <Input
            label="Billing Address"
            name="billingAddress"
            value={values.billingAddress ?? ""}
            onChange={(e) => setValues((v) => ({ ...v, billingAddress: e.target.value }))}
          />
        </div>
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

