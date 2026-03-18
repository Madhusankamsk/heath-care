import { redirect } from "next/navigation";

import { VehicleManager, type Vehicle } from "@/components/admin/VehicleManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/adminAccess";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["vehicles:list", "vehicles:read"],
  preview: ["vehicles:read"],
  create: ["vehicles:create"],
  edit: ["vehicles:update"],
  delete: ["vehicles:delete"],
} as const;

async function getVehicles() {
  return backendJson<Vehicle[]>("/api/vehicles");
}

export default async function AdminVehiclesPage() {
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

  const vehicles = await getVehicles();

  return (
    <div className="flex flex-col gap-6">
      <Card title="Vehicles" description="Actions are controlled by permissions.">
        {!vehicles ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load vehicles.
          </div>
        ) : (
          <VehicleManager
            initialVehicles={vehicles}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </Card>
    </div>
  );
}

