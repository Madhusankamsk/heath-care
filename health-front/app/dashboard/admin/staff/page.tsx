import { redirect } from "next/navigation";

import { StaffSectionTabs } from "@/components/admin/StaffSectionTabs";
import { type StaffProfile } from "@/components/admin/StaffManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/adminAccess";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

export default function AdminStaffPage() {
  return <AdminStaffPageServer />;
}

type Role = { id: string; roleName: string; description?: string | null };

const PERMS = {
  view: ["profiles:list", "profiles:read"],
  preview: ["profiles:read"],
  create: ["profiles:create"],
  edit: ["profiles:update"],
  deactivate: ["profiles:deactivate"],
  delete: ["profiles:delete"],
} as const;

async function getProfiles() {
  return backendJson<StaffProfile[]>("/api/profiles");
}

async function getRoles() {
  return backendJson<Role[]>("/api/roles");
}

async function AdminStaffPageServer() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");
  if (!canAccessAdmin(me.user.role, me.permissions)) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canPreview = hasAnyPermission(me.permissions, [...PERMS.preview]);
  const canCreate = hasAnyPermission(me.permissions, [...PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...PERMS.edit]);
  const canDeactivate = hasAnyPermission(me.permissions, [...PERMS.deactivate]);
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);

  const [profiles, roles] = await Promise.all([getProfiles(), getRoles()]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Staff" description="Actions are controlled by permissions.">
        {!profiles ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load staff list.
          </div>
        ) : !roles ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load roles.
          </div>
        ) : (
          <StaffSectionTabs
            profiles={profiles}
            roles={roles}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDeactivate={canDeactivate}
            canDelete={canDelete}
          />
        )}
      </Card>
    </div>
  );
}

