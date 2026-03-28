import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { DispatchingSubnav } from "@/components/nav/DispatchingSubnav";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const DISPATCH_VIEW_PERMS = ["bookings:list", "bookings:read"] as const;

export default async function DispatchingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...DISPATCH_VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Dispatching
          </h1>
          <span className="pill pill-info">Operations</span>
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-2">
        <DispatchingSubnav />
        {children}
      </div>
    </div>
  );
}
