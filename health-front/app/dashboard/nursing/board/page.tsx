import { NursingActiveAdmissionsManager } from "@/components/nursing/NursingActiveAdmissionsManager";
import type { NursingAdmissionRow } from "@/components/nursing/types";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";
import { redirect } from "next/navigation";

const NURSING_PERMS = {
  view: ["nursing:list", "nursing:read"],
  manage: ["nursing:manage"],
  discharge: ["nursing:discharge"],
} as const;

export default async function NursingBoardPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...NURSING_PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canManage = hasAnyPermission(me.permissions, [...NURSING_PERMS.manage]);
  const canDischarge = hasAnyPermission(me.permissions, [...NURSING_PERMS.discharge]);

  const active = await backendJson<{ items: unknown[] }>("/api/nursing/admissions/active");

  const initialAdmissions =
    active && Array.isArray(active.items) ? (active.items as NursingAdmissionRow[]) : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        {!active ? (
          <p className="text-sm text-red-700 dark:text-red-300">Unable to load active admissions.</p>
        ) : (
          <NursingActiveAdmissionsManager
            initialAdmissions={initialAdmissions}
            canManage={canManage}
            canDischarge={canDischarge}
          />
        )}
      </Card>
    </div>
  );
}
