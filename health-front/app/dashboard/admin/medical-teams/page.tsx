import { redirect } from "next/navigation";

import {
  MedicalTeamManager,
  type MedicalTeam,
} from "@/components/admin/MedicalTeamManager";
import { Card } from "@/components/ui/Card";
import { canAccessAdmin } from "@/lib/adminAccess";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["medical_teams:list", "medical_teams:read"],
  preview: ["medical_teams:read"],
  create: ["medical_teams:create"],
  edit: ["medical_teams:update"],
  delete: ["medical_teams:delete"],
} as const;

type Vehicle = {
  id: string;
  vehicleNo: string;
  model?: string | null;
  status: string;
};

type TeamMemberCandidate = {
  id: string;
  fullName: string;
  email: string;
  role?: { id: string; roleName: string } | null;
};

async function getMedicalTeams() {
  return backendJson<MedicalTeam[]>("/api/medical-teams");
}

async function getVehicles() {
  return backendJson<Vehicle[]>("/api/vehicles");
}

async function getMedicalTeamMemberCandidates() {
  return backendJson<TeamMemberCandidate[]>("/api/medical-team-members");
}

export default async function AdminMedicalTeamsPage() {
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

  const [teams, vehicles, members] = await Promise.all([
    getMedicalTeams(),
    getVehicles(),
    getMedicalTeamMemberCandidates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Medical Teams"
        description="Actions are controlled by permissions."
      >
        {!teams ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load medical teams.
          </div>
        ) : !vehicles ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load vehicles (required for team assignment).
          </div>
        ) : !members ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load staff members (required for team assignment).
          </div>
        ) : vehicles.length === 0 ? (
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            No vehicles found. Create vehicles first, then create medical teams.
          </div>
        ) : (
          <MedicalTeamManager
            initialTeams={teams}
            vehicles={vehicles}
            members={members}
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
