import { redirect } from "next/navigation";

import {
  BookingManager,
  type Booking,
  type BookingTypeOption,
  type DoctorProfileOption,
  type DoctorStatusOption,
} from "@/components/admin/BookingManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission, hasBookingScopeAll } from "@/lib/rbac";

const PERMS = {
  view: ["bookings:list", "bookings:read"],
  preview: ["bookings:read"],
  create: ["bookings:create"],
  edit: ["bookings:update"],
  delete: ["bookings:delete"],
} as const;

export default async function ManageBookingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string; type?: string }>;
}) {
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

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;
  const bookingType = normalizeBookingTypeFilter(
    typeof params.type === "string" ? params.type : undefined,
  );

  const [bookingsResult, doctorsResult, doctorStatuses, bookingTypes] = await Promise.all([
    backendJsonPaginated<Booking>(
      `/api/bookings?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery, {
        type: bookingType || undefined,
      })}`,
    ),
    backendJsonPaginated<DoctorProfileOption>(withPaginationQuery("/api/profiles", 1, 100)),
    backendJson<DoctorStatusOption[]>(
      `/api/lookups?category=${encodeURIComponent("DOCTOR_BOOKING_STATUS")}`,
    ),
    backendJson<BookingTypeOption[]>(
      `/api/lookups?category=${encodeURIComponent("BOOKING_TYPE")}`,
    ),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!bookingsResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load bookings.
          </div>
        ) : (
          <BookingManager
            initialBookings={bookingsResult.items}
            total={bookingsResult.total}
            initialPage={bookingsResult.page}
            pageSize={bookingsResult.pageSize ?? DEFAULT_PAGE_SIZE}
            doctors={doctorsResult?.items ?? []}
            doctorStatuses={doctorStatuses ?? []}
            currentUserId={me.user.id}
            scopeAll={scopeAll}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            initialQuery={listQuery ?? ""}
            bookingTypes={bookingTypes ?? []}
            initialType={bookingType}
          />
        )}
      </Card>
    </div>
  );
}

function normalizeBookingTypeFilter(input: string | undefined): string {
  const normalized = typeof input === "string" ? input.trim().toUpperCase() : "";
  return normalized || "";
}
