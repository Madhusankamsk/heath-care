import { redirect } from "next/navigation";

import { OpdDoctorConsole } from "@/components/opd/OpdDoctorConsole";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type OpdQueueRow = {
  id: string;
  tokenNo: number;
  visitDate: string;
  status: string;
  patient: { id: string; fullName: string; shortName?: string | null };
  statusLookup: { lookupKey: string; lookupValue: string } | null;
  pickedBy?: { id: string; fullName: string } | null;
  booking?: { id: string; isOpd: boolean } | null;
};

export default async function OpdDoctorPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canPick = hasAnyPermission(me.permissions, ["opd:pick"]);
  if (!canPick) redirect("/dashboard/opd/queue");

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  const queueResult = await backendJsonPaginated<OpdQueueRow>(
    `/api/opd/doctor-queue?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE)}`,
  );

  const rows = queueResult?.items ?? [];

  return (
    <Card
      title="Doctor queue"
      description="Pick waiting patients, then open the patient profile to run diagnostics and complete the visit."
    >
      {!queueResult ? (
        <p className="text-sm text-red-700 dark:text-red-300">Failed to load doctor queue.</p>
      ) : (
        <OpdDoctorConsole
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
