import { redirect } from "next/navigation";

import { MobileSubstoreManager } from "@/components/inventory/MobileSubstoreManager";
import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type SubstoreRow = {
  user: { id: string; fullName: string; email: string };
  totalQuantity: number;
  batches: Array<{ id: string; quantity: number; medicine: { name: string } }>;
};
type UserOption = { id: string; fullName: string; isActive: boolean };
type BatchOption = { id: string; batchNo: string; medicine: { name: string } };

const VIEW_PERMS = ["inventory:list", "inventory:substores:manage"] as const;

export default async function InventoryMobileSubstoresPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");
  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");
  if (!hasAnyPermission(me.permissions, [...VIEW_PERMS])) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  const [substoreResult, usersResult, batchesResult] = await Promise.all([
    backendJsonPaginated<SubstoreRow>(`/api/inventory/mobile-substores?${pageQueryString(pageNum)}`),
    backendJsonPaginated<UserOption>(withPaginationQuery("/api/profiles", 1, 100)),
    backendJsonPaginated<BatchOption>(withPaginationQuery("/api/inventory/batches", 1, 100)),
  ]);

  return (
    <Card>
      <MobileSubstoreManager
        initialRows={substoreResult?.items ?? []}
        total={substoreResult?.total ?? 0}
        initialPage={substoreResult?.page ?? pageNum}
        pageSize={substoreResult?.pageSize ?? DEFAULT_PAGE_SIZE}
        users={(usersResult?.items ?? []).filter((u) => u.isActive).map((u) => ({ id: u.id, fullName: u.fullName }))}
        batches={batchesResult?.items ?? []}
      />
    </Card>
  );
}
