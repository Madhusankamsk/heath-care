import { redirect } from "next/navigation";
import Link from "next/link";

import type { Patient } from "@/components/admin/PatientManager";
import {
  PatientBookingsHistory,
  type LabSampleTypeLookup,
} from "@/components/clients/PatientBookingsHistory";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["patients:list", "patients:read"],
  fullPreview: ["patients:read"],
  bookingsHistory: ["bookings:list", "bookings:read"],
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

  const canSeeBookings = hasAnyPermission(me.permissions, [...PERMS.bookingsHistory]);
  const canUpdateDispatch = hasAnyPermission(me.permissions, ["dispatch:update"]);
  const canSaveVisitDraft = hasAnyPermission(me.permissions, ["bookings:update"]);
  const patientBookings = canSeeBookings
    ? await backendJson<UpcomingBookingRow[]>(`/api/patients/${id}/bookings`)
    : null;
  const labSampleTypeLookups =
    canSaveVisitDraft && canSeeBookings
      ? (await backendJson<LabSampleTypeLookup[]>(
          `/api/lookups?category=${encodeURIComponent("LAB_SAMPLE_TYPE")}`,
        )) ?? []
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/clients/patient"
          className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25"
        >
          Back
        </Link>
        <div />
      </div>

      <section className="surface-card p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Patient</p>
            <h1 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              {patient.fullName}
            </h1>
            {patient.shortName ? (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{patient.shortName}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
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
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <CompactItem label="NIC/Passport" value={patient.nicOrPassport ?? "—"} />
              <CompactItem label="DOB" value={patient.dob ? String(patient.dob) : "—"} />
              <CompactItem
                label="Gender"
                value={patient.genderLookup?.lookupValue ?? patient.gender ?? "—"}
              />
              <CompactItem label="Contact" value={patient.contactNo ?? "—"} />
              <CompactItem label="WhatsApp" value={patient.whatsappNo ?? "—"} />
              <CompactItem
                label="Billing Recipient"
                value={patient.billingRecipientLookup?.lookupValue ?? "—"}
              />
              <CompactItem
                label="Subscription Plan"
                value={patient.isSubscribed ? patient.subscriptionPlanName ?? "—" : "—"}
              />
              <CompactItem
                label="Subscription Status"
                value={patient.isSubscribed ? patient.subscriptionStatusName ?? "—" : "—"}
              />
            </div>
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Address</p>
              <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                {patient.address ?? "—"}
              </p>
            </div>
          </div>
        </div>

        {patient.hasGuardian ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CompactItem label="Guardian Name" value={patient.guardianName ?? "—"} />
            <CompactItem label="Guardian Email" value={patient.guardianEmail ?? "—"} />
            <CompactItem label="Guardian Contact" value={patient.guardianContactNo ?? "—"} />
            <CompactItem label="Guardian WhatsApp" value={patient.guardianWhatsappNo ?? "—"} />
            <CompactItem
              label="Guardian Relationship"
              value={patient.guardianRelationship ?? "—"}
            />
          </div>
        ) : null}
      </section>

      <Card
        title="Bookings and Dispatch"
        description="Visit requests, dispatch runs, and crew assignments."
      >
        {canSeeBookings ? (
          patientBookings === null ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Could not load booking history. Try again or check your network connection.
            </p>
          ) : (
            <PatientBookingsHistory
              bookings={patientBookings}
              canUpdateDispatch={canUpdateDispatch}
              canSaveVisitDraft={canSaveVisitDraft}
              labSampleTypeLookups={labSampleTypeLookups}
            />
          )
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Booking and dispatch history requires{" "}
            <span className="font-medium text-[var(--text-primary)]">bookings:list</span> or{" "}
            <span className="font-medium text-[var(--text-primary)]">bookings:read</span>{" "}
            permission.
          </p>
        )}
      </Card>
    </div>
  );
}

function CompactItem({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </section>
  );
}

