import { redirect } from "next/navigation";

import { OpdQueueManager } from "@/components/opd/OpdQueueManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type OpdStatusOption = {
  id: string;
  lookupKey: string;
  lookupValue: string;
};

type PatientOption = {
  id: string;
  fullName: string;
  shortName?: string | null;
  nicOrPassport?: string | null;
  contactNo?: string | null;
};

type OpdQueueRow = {
  id: string;
  tokenNo: number;
  visitDate: string;
  status: string;
  patient: PatientOption;
  statusLookup: OpdStatusOption | null;
};

const OPD_PERMS = {
  view: ["opd:list", "opd:read"],
  create: ["opd:create"],
  edit: ["opd:update"],
  delete: ["opd:delete"],
} as const;

async function getOpdStatuses() {
  return backendJson<OpdStatusOption[]>(
    `/api/lookups?category=${encodeURIComponent("OPD_STATUS")}`,
  );
}

export default async function OpdPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...OPD_PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canCreate = hasAnyPermission(me.permissions, [...OPD_PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...OPD_PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...OPD_PERMS.delete]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [queueResult, patientsResult, statuses] = await Promise.all([
    backendJsonPaginated<OpdQueueRow>(`/api/opd?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`),
    backendJsonPaginated<PatientOption>(withPaginationQuery("/api/patients", 1, 100)),
    getOpdStatuses(),
  ]);

  const rows = queueResult?.items ?? [];
  const patients = patientsResult?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!queueResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">Failed to load OPD queue.</div>
        ) : !patientsResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">Failed to load patients.</div>
        ) : !statuses ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load OPD statuses.
          </div>
        ) : (
          <OpdQueueManager
            rows={rows}
            total={queueResult.total}
            page={queueResult.page}
            pageSize={queueResult.pageSize ?? DEFAULT_PAGE_SIZE}
            patients={patients}
            statuses={statuses}
            canCreate={canCreate}
            canUpdate={canEdit}
            canDelete={canDelete}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}
