import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { CreatePermissionForm } from "@/components/forms/CreatePermissionForm";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { canAccessSuperAdmin } from "@/lib/adminAccess";
import { hasAnyPermission } from "@/lib/rbac";

type Permission = {
  id: string;
  permissionKey: string;
};

const PERMS = {
  view: ["permissions:read", "permission:read", "permissions:list"],
  create: [
    "permissions:create",
    "permission:create",
    "permissions:write",
    "permission:write",
  ],
} as const;

async function getPermissions(): Promise<Permission[] | null> {
  return backendJson<Permission[]>("/api/permissions");
}

export default async function SuperAdminPermissionsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");
  if (!canAccessSuperAdmin(me.user.role, me.permissions)) redirect("/dashboard");
  const canViewPermissions =
    hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canViewPermissions) redirect("/dashboard");

  const canCreatePermissions =
    hasAnyPermission(me.permissions, [...PERMS.create]);

  const permissions = await getPermissions();

  return (
    <div className="flex flex-col gap-6">
      {canCreatePermissions ? (
        <Card title="Create permission" description="Requires create privileges.">
          <CreatePermissionForm />
        </Card>
      ) : null}

      <Card title="All permissions" description="Fetched from health-back.">
        {!permissions ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load permissions.
          </div>
        ) : permissions.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            No permissions found.
          </div>
        ) : (
          <ul className="grid gap-2 text-sm">
            {permissions.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-2 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
              >
                <span className="font-mono text-xs">{p.permissionKey}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

