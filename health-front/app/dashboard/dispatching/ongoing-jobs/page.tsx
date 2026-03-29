import { redirect } from "next/navigation";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";
import { OngoingJobsTable } from "@/components/dispatch/OngoingJobsTable";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["dispatch:list", "dispatch:read", "dispatch:update"] as const;

async function getOngoing() {
  return backendJson<UpcomingBookingRow[]>("/api/dispatch/ongoing");
}

async function getTeams() {
  return backendJson<MedicalTeam[]>("/api/medical-teams");
}

export default async function OngoingJobsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const canPreview = hasAnyPermission(me.permissions, ["dispatch:read"]);
  const canListTeams = hasAnyPermission(me.permissions, ["medical_teams:list"]);
  const canFullView = hasAnyPermission(me.permissions, ["patients:read"]);

  const [rows, teams] = await Promise.all([
    getOngoing(),
    canListTeams ? getTeams() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Ongoing jobs"
        description="Dispatched bookings (in transit or arrived on site). Use Preview for booking and patient details."
      >
        {!rows ? (
          <div className="text-sm text-red-700 dark:text-red-300">Failed to load ongoing jobs.</div>
        ) : (
          <OngoingJobsTable
            initialRows={rows}
            teams={teams}
            canPreview={canPreview}
            canFullView={canFullView}
          />
        )}
      </Card>
    </div>
  );
}
