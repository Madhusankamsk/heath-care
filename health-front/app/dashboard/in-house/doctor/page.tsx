import { redirect } from "next/navigation";

import { InHouseDoctorConsole } from "@/components/in-house/InHouseDoctorConsole";
import { Card } from "@/components/ui/Card";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

export default async function InHouseDoctorPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canPick = hasAnyPermission(me.permissions, ["inhouse:pick", "inhouse:clinical"]);
  if (!canPick) redirect("/dashboard/in-house/admissions");

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const q = typeof params.q === "string" ? params.q : "";

  const queueResult = await backendJsonPaginated<UpcomingBookingRow>(
    `/api/in-house/doctor-queue?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`,
  );

  const rows = queueResult?.items ?? [];

  return (
    <Card
      title="Doctor queue"
      description="Pick pending in-house bookings, then use patient workflow for diagnostics and discharge."
    >
      {!queueResult ? (
        <p className="text-sm text-red-700 dark:text-red-300">Failed to load doctor queue.</p>
      ) : (
        <InHouseDoctorConsole
          currentUserId={me.user.id}
          rows={rows}
          total={queueResult.total}
          page={queueResult.page}
          pageSize={queueResult.pageSize ?? DEFAULT_PAGE_SIZE}
        />
      )}
    </Card>
  );
}
