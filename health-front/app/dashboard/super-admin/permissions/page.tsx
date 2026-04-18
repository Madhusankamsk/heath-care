import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBarUrlSync } from "@/components/ui/TableSearchBarUrlSync";
import { RolePermissionMatrix } from "@/components/admin/RolePermissionMatrix";
import { CreatePermissionModal } from "@/components/forms/CreatePermissionModal";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { canAccessSuperAdmin } from "@/lib/adminAccess";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type Permission = {
  id: string;
  permissionKey: string;
};

type Role = {
  id: string;
  roleName: string;
  description?: string | null;
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

export default async function SuperAdminPermissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");
  if (!canAccessSuperAdmin(me.user.role, me.permissions)) redirect("/dashboard");
  const canViewPermissions = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canViewPermissions) redirect("/dashboard");

  const canCreatePermissions = hasAnyPermission(me.permissions, [...PERMS.create]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const q = typeof params.q === "string" ? params.q : "";

  const [permResult, roles] = await Promise.all([
    backendJsonPaginated<Permission>(`/api/permissions?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`),
    backendJson<Role[]>("/api/roles-with-permissions"),
  ]);

  const matrixRoles = roles ?? [];

  return (
    <div className="flex flex-col gap-6">
      {!permResult || roles === null ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">Failed to load permissions or roles.</p>
        </Card>
      ) : matrixRoles.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">No roles found.</p>
        </Card>
      ) : permResult.total === 0 ? (
        <Card>
          <CrudToolbar
            title="Role permission matrix"
            note="Actions are controlled by permissions."
            description="Grant or revoke permissions for each role."
          >
            {canCreatePermissions ? <CreatePermissionModal /> : null}
          </CrudToolbar>
          <p className="text-sm text-[var(--text-secondary)]">
            No permissions to display. Create a permission to get started.
          </p>
        </Card>
      ) : (
        <Card>
          <CrudToolbar
            title="Role permission matrix"
            note="Actions are controlled by permissions."
            description="Grant or revoke permissions for each role."
          >
            {canCreatePermissions ? <CreatePermissionModal /> : null}
          </CrudToolbar>
          <TableSearchBarUrlSync
            initialQuery={q}
            id="permissions-search"
            placeholder="Permission key…"
          />
          <RolePermissionMatrix roles={matrixRoles} permissions={permResult.items} />
          <TablePaginationBar
            page={permResult.page}
            pageSize={permResult.pageSize ?? DEFAULT_PAGE_SIZE}
            total={permResult.total}
            hrefForPage={(p) =>
              `/dashboard/super-admin/permissions?${pageQueryString(p, permResult.pageSize ?? DEFAULT_PAGE_SIZE, q)}`
            }
          />
        </Card>
      )}
    </div>
  );
}
