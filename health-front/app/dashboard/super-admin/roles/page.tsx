import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBarUrlSync } from "@/components/ui/TableSearchBarUrlSync";
import { CreateRoleModal } from "@/components/forms/CreateRoleModal";
import { RolesTable } from "@/components/admin/RolesTable";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { canAccessSuperAdmin } from "@/lib/adminAccess";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
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

export default async function SuperAdminRolesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  if (!canAccessSuperAdmin(me.user.role, me.permissions)) redirect("/dashboard");

  const canViewRoles = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canViewRoles) redirect("/dashboard");

  const canCreateRoles = hasAnyPermission(me.permissions, [...PERMS.create]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const q = typeof params.q === "string" ? params.q : "";

  const result = await backendJsonPaginated<Role>(
    `/api/roles?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`,
  );
  const roles = result?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CrudToolbar
          title="All roles"
          note="Actions are controlled by permissions."
          description="Fetched from health-back."
        >
          {canCreateRoles ? <CreateRoleModal /> : null}
        </CrudToolbar>
        <TableSearchBarUrlSync initialQuery={q} id="roles-search" placeholder="Role name…" />
        {!result ? (
          <div className="text-sm text-[var(--danger)]">Failed to load roles.</div>
        ) : roles.length === 0 ? (
          <div className="text-sm text-[var(--text-secondary)]">No roles found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <RolesTable roles={roles} />
            </div>
            <TablePaginationBar
              page={result.page}
              pageSize={result.pageSize ?? DEFAULT_PAGE_SIZE}
              total={result.total}
              hrefForPage={(p) =>
                `/dashboard/super-admin/roles?${pageQueryString(p, result.pageSize ?? DEFAULT_PAGE_SIZE, q)}`
              }
            />
          </>
        )}
      </Card>
    </div>
  );
}
