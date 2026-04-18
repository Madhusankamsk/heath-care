import { redirect } from "next/navigation";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";
import { OngoingJobsTable } from "@/components/dispatch/OngoingJobsTable";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["dispatch:list", "dispatch:read", "dispatch:update"] as const;

export default async function OngoingJobsPage({
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
  const canListTeams = hasAnyPermission(me.permissions, ["medical_teams:list"]);
  const canFullView = hasAnyPermission(me.permissions, ["patients:read"]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [ongoingResult, teamsResult] = await Promise.all([
    backendJsonPaginated<UpcomingBookingRow>(
      `/api/dispatch/ongoing?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`,
    ),
    canListTeams
      ? backendJsonPaginated<MedicalTeam>(withPaginationQuery("/api/medical-teams", 1, 100))
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CrudToolbar
          title="Ongoing jobs"
          note="Actions are controlled by permissions."
          description="Dispatched bookings (in transit or arrived on site)."
        />
        {!ongoingResult ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            Failed to load ongoing jobs.
          </div>
        ) : (
          <OngoingJobsTable
            initialRows={ongoingResult.items}
            total={ongoingResult.total}
            initialPage={ongoingResult.page}
            pageSize={ongoingResult.pageSize ?? DEFAULT_PAGE_SIZE}
            teams={teamsResult?.items ?? null}
            canPreview={canPreview}
            canFullView={canFullView}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}
