import { redirect } from "next/navigation";

import { StockMovementManager } from "@/components/inventory/StockMovementManager";
import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type Movement = {
  id: string;
  createdAt: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  status: string;
  medicine: { name: string };
  batch: { batchNo: string };
  transferredBy: { fullName: string };
};

type BatchWithLocation = {
  id: string;
  batchNo: string;
  medicine: { name: string };
  locationType?: string | null;
  locationId?: string | null;
  quantity?: number;
};

const VIEW_PERMS = ["inventory:list", "inventory:movements:manage"] as const;

export default async function InventoryStockMovementsPage({
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

  const [movementsResult, batchesResult] = await Promise.all([
    backendJsonPaginated<Movement>(`/api/inventory/stock-movements?${pageQueryString(pageNum)}`),
    backendJsonPaginated<BatchWithLocation>(withPaginationQuery("/api/inventory/batches", 1, 100)),
  ]);

  return (
    <Card>
      <StockMovementManager
        initialRows={movementsResult?.items ?? []}
        total={movementsResult?.total ?? 0}
        initialPage={movementsResult?.page ?? pageNum}
        pageSize={movementsResult?.pageSize ?? DEFAULT_PAGE_SIZE}
        batches={batchesResult?.items ?? []}
      />
    </Card>
  );
}
