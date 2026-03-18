import { redirect } from "next/navigation";

import { AdminTabs } from "@/components/AdminTabs";
import { Card } from "@/components/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission, isAdminRole } from "@/lib/rbac";

const PERMS = {
  viewRoles: ["roles:read", "role:read", "roles:list"],
  viewPermissions: ["permissions:read", "permission:read", "permissions:list"],
} as const;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canViewRoles =
    isAdminRole(me.user.role) ||
    hasAnyPermission(me.permissions, [...PERMS.viewRoles]);
  const canViewPermissions =
    isAdminRole(me.user.role) ||
    hasAnyPermission(me.permissions, [...PERMS.viewPermissions]);

  if (!canViewRoles && !canViewPermissions) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Admin actions are restricted by role/permissions.
        </p>
        <AdminTabs
          canViewRoles={canViewRoles}
          canViewPermissions={canViewPermissions}
        />
      </header>

      <Card>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Signed in as <span className="font-medium">{me.user.email}</span>
          {me.user.role ? (
            <>
              {" "}
              · role: <span className="font-medium">{me.user.role}</span>
            </>
          ) : null}
        </div>
      </Card>

      {children}
    </div>
  );
}

