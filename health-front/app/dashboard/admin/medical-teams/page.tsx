import { redirect } from "next/navigation";

import {
  MedicalTeamManager,
  type MedicalTeam,
} from "@/components/admin/MedicalTeamManager";
import { Card } from "@/components/ui/Card";
import { canAccessAdmin } from "@/lib/adminAccess";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
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

async function getMedicalTeamMemberCandidates() {
  return backendJson<TeamMemberCandidate[]>("/api/medical-team-members");
}

export default async function AdminMedicalTeamsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
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

  const [teamsResult, vehiclesResult, members] = await Promise.all([
    backendJsonPaginated<MedicalTeam>(`/api/medical-teams?${pageQueryString(pageNum)}`),
    backendJsonPaginated<Vehicle>(withPaginationQuery("/api/vehicles", 1, 100)),
    getMedicalTeamMemberCandidates(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!teamsResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load medical teams.
          </div>
        ) : !vehiclesResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load vehicles.
          </div>
        ) : !members ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load member candidates.
          </div>
        ) : (
          <MedicalTeamManager
            initialTeams={teamsResult.items}
            total={teamsResult.total}
            initialPage={teamsResult.page}
            pageSize={teamsResult.pageSize ?? DEFAULT_PAGE_SIZE}
            vehicles={vehiclesResult.items}
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
