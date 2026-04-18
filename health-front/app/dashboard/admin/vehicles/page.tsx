import { redirect } from "next/navigation";

import { VehicleManager, type Vehicle } from "@/components/admin/VehicleManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/adminAccess";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["vehicles:list", "vehicles:read"],
  preview: ["vehicles:read"],
  create: ["vehicles:create"],
  edit: ["vehicles:update"],
  delete: ["vehicles:delete"],
} as const;

type DriverOption = { id: string; fullName: string; isActive: boolean };
async function getDrivers() {
  return backendJsonPaginated<DriverOption>(withPaginationQuery("/api/profiles", 1, 100));
}

export default async function AdminVehiclesPage({
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
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [vehiclesResult, driversResult] = await Promise.all([
    backendJsonPaginated<Vehicle>(`/api/vehicles?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`),
    getDrivers(),
  ]);

  const drivers = (driversResult?.items ?? []).filter((d) => d.isActive);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!vehiclesResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load vehicles.
          </div>
        ) : (
          <VehicleManager
            initialVehicles={vehiclesResult.items}
            total={vehiclesResult.total}
            initialPage={vehiclesResult.page}
            pageSize={vehiclesResult.pageSize ?? DEFAULT_PAGE_SIZE}
            drivers={drivers}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}
