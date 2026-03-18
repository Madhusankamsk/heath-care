import { redirect } from "next/navigation";

import { Card } from "@/components/Card";
import { CreatePermissionForm } from "@/components/CreatePermissionForm";
import { getIsAuthenticated } from "@/lib/auth";
import type { BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission, isAdminRole } from "@/lib/rbac";
import { getSiteOrigin } from "@/lib/siteUrl";

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

async function getMe(): Promise<BackendMeResponse | null> {
  const origin = await getSiteOrigin();
  const res = await fetch(`${origin}/api/me`, { cache: "no-store" }).catch(
    () => null,
  );
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as BackendMeResponse | null;
}

async function getPermissions(): Promise<Permission[] | null> {
  const origin = await getSiteOrigin();
  const res = await fetch(`${origin}/api/permissions`, {
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  return (await res.json().catch(() => null)) as Permission[] | null;
}

export default async function AdminPermissionsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await getMe();
  if (!me) redirect("/dashboard");
  const canViewPermissions =
    isAdminRole(me.user.role) ||
    hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canViewPermissions) redirect("/dashboard");

  const canCreatePermissions =
    isAdminRole(me.user.role) ||
    hasAnyPermission(me.permissions, [...PERMS.create]);

  const permissions = await getPermissions();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Permissions</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          View permission keys in the system.
        </p>
      </header>

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

