import { redirect } from "next/navigation";

import { PatientBookingsHistory } from "@/components/clients/PatientBookingsHistory";
import type { LabSampleTypeLookup } from "@/components/clients/PatientBookingsHistory";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["inhouse:list", "inhouse:read"] as const;

export default async function InHouseInCarePage({
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

  const canClinical = hasAnyPermission(me.permissions, ["bookings:update", "inhouse:clinical"]);
  const canDischarge = hasAnyPermission(me.permissions, ["inhouse:discharge"]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [bookingsResult, labTypes] = await Promise.all([
    backendJsonPaginated<UpcomingBookingRow>(
      `/api/in-house/in-care?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`,
    ),
    backendJson<LabSampleTypeLookup[]>(
      `/api/lookups?category=${encodeURIComponent("LAB_SAMPLE_TYPE")}`,
    ),
  ]);

  const bookings = bookingsResult?.items ?? [];

  return (
    <Card>
      <CrudToolbar
        title="In care"
        description="Diagnostics, samples, and medicines for admitted in-house patients. Discharge generates an in-house invoice."
      />
      <div className="mt-4">
        <PatientBookingsHistory
          bookings={bookings}
          canUpdateDispatch={false}
          canSaveVisitDraft={canClinical}
          canDischargeInHouse={canDischarge}
          labSampleTypeLookups={labTypes ?? []}
        />
      </div>
    </Card>
  );
}
