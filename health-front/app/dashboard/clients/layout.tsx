import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/nav/Breadcrumbs";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const CLIENTS_VIEW_PERMS = ["patients:list", "patients:read"] as const;

export default async function ClientsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canViewClients = hasAnyPermission(me.permissions, [...CLIENTS_VIEW_PERMS]);
  if (!canViewClients) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <h1 className="text-lg font-semibold tracking-tight">Clients</h1>
      </div>
      {children}
    </div>
  );
}
