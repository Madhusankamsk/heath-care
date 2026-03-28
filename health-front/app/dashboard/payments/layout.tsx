import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { PaymentsSubnav } from "@/components/nav/PaymentsSubnav";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const PAYMENTS_VIEW_PERMS = ["invoices:read", "patients:read", "profiles:read"] as const;

export default async function PaymentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PAYMENTS_VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
            Payments
          </h1>
          <span className="pill pill-info">Billing</span>
        </div>
      </div>
      <div className="flex flex-col gap-4 pt-2">
        <PaymentsSubnav />
        {children}
      </div>
    </div>
  );
}
