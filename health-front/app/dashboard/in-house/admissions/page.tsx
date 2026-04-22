import { redirect } from "next/navigation";

import { InHouseAdmissionsClient } from "@/components/in-house/InHouseAdmissionsClient";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["inhouse:list", "inhouse:read"] as const;

export default async function InHouseAdmissionsPage({
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

  const canAdmit = hasAnyPermission(me.permissions, ["inhouse:admit"]);
  const canCreate = hasAnyPermission(me.permissions, ["inhouse:admit"]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const pendingResult = await backendJsonPaginated<UpcomingBookingRow>(
    `/api/in-house/pending-admissions?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`,
  );

  return (
    <InHouseAdmissionsClient
      initialRows={pendingResult?.items ?? []}
      total={pendingResult?.total ?? 0}
      initialPage={pendingResult?.page ?? pageNum}
      pageSize={pendingResult?.pageSize ?? DEFAULT_PAGE_SIZE}
      canAdmit={canAdmit}
      canCreate={canCreate}
      initialQuery={listQuery ?? ""}
    />
  );
}
