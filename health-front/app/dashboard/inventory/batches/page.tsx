import { redirect } from "next/navigation";

import { InventoryBatchManager } from "@/components/inventory/InventoryBatchManager";
import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type MedicineOption = { id: string; name: string };
type Batch = {
  id: string;
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  buyingPrice: number | string;
  locationType: string;
  locationId?: string | null;
  medicine: { id: string; name: string };
};

const VIEW_PERMS = ["inventory:list", "inventory:batches:manage"] as const;

export default async function InventoryBatchesPage({
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

  const [batchResult, medResult, itemResult] = await Promise.all([
    backendJsonPaginated<Batch>(`/api/inventory/batches?${pageQueryString(pageNum)}`),
    backendJsonPaginated<MedicineOption>(withPaginationQuery("/api/inventory/medicines", 1, 100)),
    backendJsonPaginated<MedicineOption>(withPaginationQuery("/api/inventory/medical-items", 1, 100)),
  ]);

  const medicines = [...(medResult?.items ?? []), ...(itemResult?.items ?? [])];

  return (
    <Card>
      <InventoryBatchManager
        initialRows={batchResult?.items ?? []}
        total={batchResult?.total ?? 0}
        initialPage={batchResult?.page ?? pageNum}
        pageSize={batchResult?.pageSize ?? DEFAULT_PAGE_SIZE}
        medicines={medicines}
      />
    </Card>
  );
}
