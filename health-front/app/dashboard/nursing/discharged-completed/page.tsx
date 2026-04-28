import { redirect } from "next/navigation";

import { NursingDischargedAdmissionsManager } from "@/components/nursing/NursingDischargedAdmissionsManager";
import type { NursingAdmissionRow } from "@/components/nursing/types";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const NURSING_PERMS = {
  view: ["nursing:list", "nursing:read"],
} as const;

export default async function NursingDischargedCompletedPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...NURSING_PERMS.view]);
  if (!canView) redirect("/dashboard");

  const discharged = await backendJson<{ items: unknown[] }>("/api/nursing/admissions/discharged");
  const admissions =
    discharged && Array.isArray(discharged.items)
      ? (discharged.items as NursingAdmissionRow[])
      : [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        {!discharged ? (
          <p className="text-sm text-red-700 dark:text-red-300">
            Unable to load discharged admissions.
          </p>
        ) : (
          <NursingDischargedAdmissionsManager admissions={admissions} />
        )}
      </Card>
    </div>
  );
}
