import { redirect } from "next/navigation";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";
import {
  UpcomingJobsTable,
  type DispatchMemberCandidate,
  type DispatchVehicleOption,
} from "@/components/dispatch/UpcomingJobsTable";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["dispatch:list", "dispatch:read", "dispatch:update"] as const;

async function getUpcoming() {
  return backendJson<UpcomingBookingRow[]>("/api/dispatch/upcoming");
}

async function getTeams() {
  return backendJson<MedicalTeam[]>("/api/medical-teams");
}

async function getDispatchMemberCandidates() {
  return backendJson<DispatchMemberCandidate[]>("/api/dispatch/member-candidates");
}

async function getVehicles() {
  return backendJson<DispatchVehicleOption[]>("/api/vehicles");
}

export default async function UpcomingJobsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const canPreview = hasAnyPermission(me.permissions, ["dispatch:read"]);
  const canEditDispatch = hasAnyPermission(me.permissions, ["dispatch:update"]);
  const canListTeams = hasAnyPermission(me.permissions, ["medical_teams:list"]);
  const canAssignTeam = canEditDispatch && canListTeams;
  const canListVehicles = hasAnyPermission(me.permissions, ["vehicles:list", "vehicles:read"]);
  const canFullViewBooking = hasAnyPermission(me.permissions, ["patients:read"]);

  const [rows, teams, crewCandidates, vehicles] = await Promise.all([
    getUpcoming(),
    canAssignTeam ? getTeams() : Promise.resolve(null),
    canAssignTeam ? getDispatchMemberCandidates() : Promise.resolve(null),
    canAssignTeam && canListVehicles ? getVehicles() : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Upcoming jobs"
        description="Accepted bookings not yet dispatched. After you dispatch a team, the job moves to Ongoing jobs. Preview Full View opens the patient page when you have patients:read."
      >
        {!rows ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load upcoming jobs.
          </div>
        ) : (
          <UpcomingJobsTable
            initialRows={rows}
            teams={teams}
            vehicles={vehicles}
            crewCandidates={crewCandidates}
            canPreview={canPreview}
            canAssignTeam={canAssignTeam}
            canFullViewBooking={canFullViewBooking}
          />
        )}
      </Card>
    </div>
  );
}
