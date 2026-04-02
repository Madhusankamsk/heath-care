import type { Patient } from "@/components/admin/PatientManager";

export type PatientPreviewBodyProps = {
  patient: Patient;
};

/** Same layout as the Patients list “Preview patient” modal (read-only sections). */
export function PatientPreviewBody({ patient }: PatientPreviewBodyProps) {
  const selected = patient;
  return (
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
            <dt className="preview-label">Email (invoice delivery)</dt>
            <dd className="preview-value">{selected.email ?? "—"}</dd>
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
  );
}
