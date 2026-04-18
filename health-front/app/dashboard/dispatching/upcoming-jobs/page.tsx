import { redirect } from "next/navigation";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";
import {
  UpcomingJobsTable,
  type DispatchMemberCandidate,
  type DispatchVehicleOption,
} from "@/components/dispatch/UpcomingJobsTable";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["dispatch:list", "dispatch:read", "dispatch:update"] as const;

export default async function UpcomingJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
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

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [upcomingResult, teamsResult, crewCandidates, vehiclesResult] = await Promise.all([
    backendJsonPaginated<UpcomingBookingRow>(
      `/api/dispatch/upcoming?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`,
    ),
    canAssignTeam
      ? backendJsonPaginated<MedicalTeam>(withPaginationQuery("/api/medical-teams", 1, 100))
      : Promise.resolve(null),
    canAssignTeam
      ? backendJson<DispatchMemberCandidate[]>("/api/dispatch/member-candidates")
      : Promise.resolve(null),
    canAssignTeam && canListVehicles
      ? backendJsonPaginated<DispatchVehicleOption>(withPaginationQuery("/api/vehicles", 1, 100))
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CrudToolbar
          title="Upcoming jobs"
          note="Actions are controlled by permissions."
          description="Accepted bookings not yet dispatched. After you dispatch a team, the job moves to Ongoing jobs."
        />
        {!upcomingResult ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            Failed to load upcoming jobs.
          </div>
        ) : (
          <UpcomingJobsTable
            initialRows={upcomingResult.items}
            total={upcomingResult.total}
            initialPage={upcomingResult.page}
            pageSize={upcomingResult.pageSize ?? DEFAULT_PAGE_SIZE}
            teams={teamsResult?.items ?? null}
            vehicles={vehiclesResult?.items ?? null}
            crewCandidates={crewCandidates}
            canPreview={canPreview}
            canAssignTeam={canAssignTeam}
            canFullViewBooking={canFullViewBooking}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}
