import { redirect } from "next/navigation";

import {
  BookingManager,
  type Booking,
  type DoctorProfileOption,
  type DoctorStatusOption,
} from "@/components/admin/BookingManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission, hasBookingScopeAll } from "@/lib/rbac";

const PERMS = {
  view: ["bookings:list", "bookings:read"],
  preview: ["bookings:read"],
  create: ["bookings:create"],
  edit: ["bookings:update"],
  delete: ["bookings:delete"],
} as const;

type Patient = {
  id: string;
  fullName: string;
  shortName?: string | null;
  nicOrPassport?: string | null;
  contactNo?: string | null;
  whatsappNo?: string | null;
};

async function getBookings() {
  return backendJson<Booking[]>("/api/bookings");
}

async function getPatients() {
  return backendJson<Patient[]>("/api/patients");
}

async function getProfiles() {
  return backendJson<DoctorProfileOption[]>("/api/profiles");
}

async function getDoctorStatuses() {
  return backendJson<DoctorStatusOption[]>(
    `/api/lookups?category=${encodeURIComponent("DOCTOR_BOOKING_STATUS")}`,
  );
}

export default async function ManageBookingsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canPreview = hasAnyPermission(me.permissions, [...PERMS.preview]);
  const canCreate = hasAnyPermission(me.permissions, [...PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);
  const scopeAll = hasBookingScopeAll(me.permissions);

  const [bookings, patients, doctors, doctorStatuses] = await Promise.all([
    getBookings(),
    getPatients(),
    getProfiles(),
    getDoctorStatuses(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Manage Bookings" description="Actions are controlled by permissions.">
        {!bookings ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load bookings.
          </div>
        ) : !patients ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load patients (required for booking assignment).
          </div>
        ) : patients.length === 0 ? (
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            No patients found. Create patients first.
          </div>
        ) : (
          <BookingManager
            initialBookings={bookings}
            patients={patients}
            doctors={doctors ?? []}
            doctorStatuses={doctorStatuses ?? []}
            currentUserId={me.user.id}
            scopeAll={scopeAll}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </Card>
    </div>
  );
}
