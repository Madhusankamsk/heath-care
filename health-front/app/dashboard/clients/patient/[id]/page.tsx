import { redirect } from "next/navigation";
import Link from "next/link";

import type { Patient } from "@/components/admin/PatientManager";
import {
  type LabSampleTypeLookup,
} from "@/components/clients/patient-bookings/shared";
import { PatientBookingsSection } from "@/components/clients/patient-full-view/PatientBookingsSection";
import { PatientProfileOverview } from "@/components/clients/patient-full-view/PatientProfileOverview";
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

      <Card title="Patient Details" description="Read-only full patient preview.">
        <PatientProfileOverview patient={patient} />
      </Card>

      <PatientBookingsSection
        canSeeBookings={canSeeBookings}
        canUpdateDispatch={canUpdateDispatch}
        canSaveVisitDraft={canSaveVisitDraft}
        patientBookings={patientBookings}
        labSampleTypeLookups={labSampleTypeLookups}
      />
    </div>
  );
}

