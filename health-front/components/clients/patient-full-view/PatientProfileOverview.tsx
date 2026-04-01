import type { Patient } from "@/components/admin/PatientManager";

function CompactItem({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </section>
  );
}

export function PatientProfileOverview({ patient }: { patient: Patient }) {
  return (
    <>
      <div className="preview-shell sm:grid-cols-2">
        <section className="preview-section">
          <h3 className="preview-section-title">Patient</h3>
          <dl className="preview-list">
            <div className="preview-row">
              <dt className="preview-label">Full Name</dt>
              <dd className="preview-value">{patient.fullName ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Short Name</dt>
              <dd className="preview-value">{patient.shortName ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">NIC/Passport</dt>
              <dd className="preview-value">{patient.nicOrPassport ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">DOB</dt>
              <dd className="preview-value">{patient.dob ? String(patient.dob) : "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Gender</dt>
              <dd className="preview-value">
                {patient.genderLookup?.lookupValue ?? patient.gender ?? "—"}
              </dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Address</dt>
              <dd className="preview-value">{patient.address ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="preview-section">
          <h3 className="preview-section-title">Contact & Account</h3>
          <dl className="preview-list">
            <div className="preview-row">
              <dt className="preview-label">Contact</dt>
              <dd className="preview-value">{patient.contactNo ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">WhatsApp</dt>
              <dd className="preview-value">{patient.whatsappNo ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Billing Recipient</dt>
              <dd className="preview-value">{patient.billingRecipientLookup?.lookupValue ?? "—"}</dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Subscription Plan</dt>
              <dd className="preview-value">
                {patient.isSubscribed ? patient.subscriptionPlanName ?? "—" : "—"}
              </dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Subscription Status</dt>
              <dd className="preview-value">
                {patient.isSubscribed ? patient.subscriptionStatusName ?? "—" : "—"}
              </dd>
            </div>
            <div className="preview-row">
              <dt className="preview-label">Flags</dt>
              <dd className="preview-value">
                <div className="flex flex-wrap gap-2">
                  <span className={patient.isSubscribed ? "pill pill-success" : "pill pill-warning"}>
                    {patient.isSubscribed ? "Subscribed" : "Not subscribed"}
                  </span>
                  <span className={patient.hasInsurance ? "pill pill-info" : "pill pill-warning"}>
                    Insurance: {patient.hasInsurance ? "Yes" : "No"}
                  </span>
                  <span className={patient.hasGuardian ? "pill pill-info" : "pill pill-warning"}>
                    Guardian: {patient.hasGuardian ? "Yes" : "No"}
                  </span>
                </div>
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {patient.hasGuardian ? (
        <div className="mt-4">
          <h3 className="preview-section-title">Guardian</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <CompactItem label="Guardian Name" value={patient.guardianName ?? "—"} />
            <CompactItem label="Guardian Email" value={patient.guardianEmail ?? "—"} />
            <CompactItem label="Guardian Contact" value={patient.guardianContactNo ?? "—"} />
            <CompactItem label="Guardian WhatsApp" value={patient.guardianWhatsappNo ?? "—"} />
            <CompactItem label="Guardian Relationship" value={patient.guardianRelationship ?? "—"} />
          </div>
        </div>
      ) : null}
    </>
  );
}
