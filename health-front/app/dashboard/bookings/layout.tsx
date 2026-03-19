import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const BOOKINGS_VIEW_PERMS = ["bookings:list", "bookings:read"] as const;

export default async function BookingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canViewBookings = hasAnyPermission(me.permissions, [...BOOKINGS_VIEW_PERMS]);
  if (!canViewBookings) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Bookings
          </h1>
          <span className="pill pill-info">Scheduling</span>
        </div>
      </div>
      {children}
    </div>
  );
}
