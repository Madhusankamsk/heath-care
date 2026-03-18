import { redirect } from "next/navigation";

import { Card } from "@/components/Card";
import { CreateRoleForm } from "@/components/CreateRoleForm";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission, isAdminRole } from "@/lib/rbac";

type Role = {
  id: string;
  roleName: string;
  description?: string | null;
};

const PERMS = {
  view: ["roles:read", "role:read", "roles:list"],
  create: ["roles:create", "role:create", "roles:write", "role:write"],
} as const;

async function getRoles(): Promise<Role[] | null> {
  return backendJson<Role[]>("/api/roles");
}

export default async function AdminRolesPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canViewRoles =
    isAdminRole(me.user.role) || hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canViewRoles) redirect("/dashboard");

  const canCreateRoles =
    isAdminRole(me.user.role) ||
    hasAnyPermission(me.permissions, [...PERMS.create]);

  const roles = await getRoles();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Roles</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          View roles in the system.
        </p>
      </header>

      {canCreateRoles ? (
        <Card title="Create role" description="Requires create privileges.">
          <CreateRoleForm />
        </Card>
      ) : null}

      <Card title="All roles" description="Fetched from health-back.">
        {!roles ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load roles.
          </div>
        ) : roles.length === 0 ? (
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            No roles found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr
                    key={role.id}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <td className="px-3 py-2 font-medium">{role.roleName}</td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {role.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

