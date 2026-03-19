import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { CreateRoleModal } from "@/components/forms/CreateRoleModal";
import { RolesTable } from "@/components/admin/RolesTable";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { canAccessSuperAdmin } from "@/lib/adminAccess";
import { hasAnyPermission } from "@/lib/rbac";

type Role = {
  id: string;
  roleName: string;
  description?: string | null;
  permissions?: { permission: { permissionKey: string } }[];
  users?: { id: string }[];
};

const PERMS = {
  view: ["roles:read", "role:read", "roles:list"],
  create: ["roles:create", "role:create", "roles:write", "role:write"],
} as const;

async function getRoles(): Promise<Role[] | null> {
  return backendJson<Role[]>("/api/roles-with-permissions");
}

export default async function SuperAdminRolesPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  if (!canAccessSuperAdmin(me.user.role, me.permissions)) redirect("/dashboard");

  const canViewRoles =
    hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canViewRoles) redirect("/dashboard");

  const canCreateRoles =
    hasAnyPermission(me.permissions, [...PERMS.create]);

  const roles = await getRoles();

  return (
    <div className="flex flex-col gap-6">
      {canCreateRoles ? (
        <div className="flex justify-end">
          <CreateRoleModal />
        </div>
      ) : null}

      <Card title="All roles" description="Fetched from health-back.">
        {!roles ? (
          <div className="text-sm text-[var(--danger)]">
            Failed to load roles.
          </div>
        ) : roles.length === 0 ? (
          <div className="text-sm text-[var(--text-secondary)]">
            No roles found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <RolesTable roles={roles} />
          </div>
        )}
      </Card>
    </div>
  );
}

