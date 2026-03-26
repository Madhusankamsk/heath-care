import { redirect } from "next/navigation";
import Link from "next/link";

import type { Patient } from "@/components/admin/PatientManager";
import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["patients:list", "patients:read"],
  fullPreview: ["patients:read"],
} as const;

export default async function PatientFullPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canFullPreview = hasAnyPermission(me.permissions, [...PERMS.fullPreview]);
  if (!canFullPreview) redirect("/dashboard");

  const { id } = await params;
  const patient = await backendJson<Patient>(`/api/patients/${id}`);
  if (!patient) redirect("/dashboard/clients/patient");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/clients/patient"
          className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25"
        >
          Back
        </Link>
        <div className="text-sm text-[var(--text-secondary)]">Full Preview</div>
      </div>

      <Card
        title="Patient Details"
        description="Read-only patient information."
      >
        <div className="preview-shell sm:grid-cols-2">
          <section className="preview-section">
            <h3 className="preview-section-title">Identity</h3>
            <dl className="preview-list">
              <div className="preview-row">
                <dt className="preview-label">Name</dt>
                <dd className="preview-value">{patient.fullName}</dd>
              </div>
              {patient.shortName ? (
                <div className="preview-row">
                  <dt className="preview-label">Short name</dt>
                  <dd className="preview-value">{patient.shortName}</dd>
                </div>
              ) : null}
              <div className="preview-row">
                <dt className="preview-label">NIC/Passport</dt>
                <dd className="preview-value">{patient.nicOrPassport ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">DOB</dt>
                <dd className="preview-value">
                  {patient.dob ? String(patient.dob) : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="preview-section">
            <h3 className="preview-section-title">Contact</h3>
            <dl className="preview-list">
              <div className="preview-row">
                <dt className="preview-label">Contact</dt>
                <dd className="preview-value">{patient.contactNo ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Patient WhatsApp</dt>
                <dd className="preview-value">{patient.whatsappNo ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Address</dt>
                <dd className="preview-value">{patient.address ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="preview-section">
            <h3 className="preview-section-title">Demographics</h3>
            <dl className="preview-list">
              <div className="preview-row">
                <dt className="preview-label">Gender</dt>
                <dd className="preview-value">
                  {patient.genderLookup?.lookupValue ?? patient.gender ?? "—"}
                </dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Billing Recipient</dt>
                <dd className="preview-value">
                  {patient.billingRecipientLookup?.lookupValue ?? "—"}
                </dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Subscribed</dt>
                <dd className="preview-value">{patient.isSubscribed ? "Yes" : "No"}</dd>
              </div>
              {patient.isSubscribed ? (
                <div className="preview-row">
                  <dt className="preview-label">Subscription Plan</dt>
                  <dd className="preview-value">{patient.subscriptionPlanName ?? "—"}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="preview-section">
            <h3 className="preview-section-title">Guardian & Coverage</h3>
            <dl className="preview-list">
              <div className="preview-row">
                <dt className="preview-label">Has Insurance</dt>
                <dd className="preview-value">{patient.hasInsurance ? "Yes" : "No"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Has Guardian</dt>
                <dd className="preview-value">{patient.hasGuardian ? "Yes" : "No"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Guardian Name</dt>
                <dd className="preview-value">{patient.guardianName ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Guardian Email</dt>
                <dd className="preview-value">{patient.guardianEmail ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Guardian WhatsApp</dt>
                <dd className="preview-value">{patient.guardianWhatsappNo ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Guardian Contact No</dt>
                <dd className="preview-value">{patient.guardianContactNo ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Guardian Relationship</dt>
                <dd className="preview-value">{patient.guardianRelationship ?? "—"}</dd>
              </div>
            </dl>
          </section>
        </div>
      </Card>
    </div>
  );
}

