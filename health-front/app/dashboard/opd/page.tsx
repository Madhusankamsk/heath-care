import { redirect } from "next/navigation";

import { OpdQueueManager } from "@/components/opd/OpdQueueManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
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

async function getQueue() {
  return backendJson<OpdQueueRow[]>("/api/opd");
}

async function getPatients() {
  return backendJson<PatientOption[]>("/api/patients");
}

async function getOpdStatuses() {
  return backendJson<OpdStatusOption[]>(
    `/api/lookups?category=${encodeURIComponent("OPD_STATUS")}`,
  );
}

export default async function OpdPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...OPD_PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canCreate = hasAnyPermission(me.permissions, [...OPD_PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...OPD_PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...OPD_PERMS.delete]);

  const [rows, patients, statuses] = await Promise.all([
    getQueue(),
    getPatients(),
    getOpdStatuses(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!rows ? (
          <div className="text-sm text-red-700 dark:text-red-300">Failed to load OPD queue.</div>
        ) : !patients ? (
          <div className="text-sm text-red-700 dark:text-red-300">Failed to load patients.</div>
        ) : !statuses ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load OPD statuses.
          </div>
        ) : (
          <OpdQueueManager
            rows={rows}
            patients={patients}
            statuses={statuses}
            canCreate={canCreate}
            canUpdate={canEdit}
            canDelete={canDelete}
          />
        )}
      </Card>
    </div>
  );
}
