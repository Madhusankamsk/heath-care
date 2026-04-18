import { redirect } from "next/navigation";

import { StaffSectionTabs } from "@/components/admin/StaffSectionTabs";
import { type StaffProfile } from "@/components/admin/StaffManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/adminAccess";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

export default function AdminStaffPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  return <AdminStaffPageServer searchParams={searchParams} />;
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

async function getRolesForPicker() {
  return backendJsonPaginated<Role>(withPaginationQuery("/api/roles", 1, 100));
}

async function AdminStaffPageServer({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
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

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [profilesResult, rolesResult] = await Promise.all([
    backendJsonPaginated<StaffProfile>(`/api/profiles?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`),
    getRolesForPicker(),
  ]);
  const roles = rolesResult?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!profilesResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load staff list.
          </div>
        ) : !rolesResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load roles.
          </div>
        ) : (
          <StaffSectionTabs
            profiles={profilesResult.items}
            total={profilesResult.total}
            initialPage={profilesResult.page}
            pageSize={profilesResult.pageSize ?? DEFAULT_PAGE_SIZE}
            roles={roles}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDeactivate={canDeactivate}
            canDelete={canDelete}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}

