import { redirect } from "next/navigation";

import { InventoryEntityManager, type InventoryEntity } from "@/components/inventory/InventoryEntityManager";
import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["inventory:list", "inventory:read"],
  create: ["inventory:create"],
  edit: ["inventory:update"],
  delete: ["inventory:delete"],
} as const;

export default async function InventoryMedicinesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");
  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  if (!hasAnyPermission(me.permissions, [...PERMS.view])) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const result = await backendJsonPaginated<InventoryEntity>(
    `/api/inventory/medicines?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`,
  );
  const rows = result?.items ?? [];

  return (
    <Card>
      <InventoryEntityManager
        title="Medicines"
        endpoint="/api/inventory/medicines"
        initialRows={rows}
        total={result?.total ?? 0}
        initialPage={result?.page ?? pageNum}
        pageSize={result?.pageSize ?? DEFAULT_PAGE_SIZE}
        canCreate={hasAnyPermission(me.permissions, [...PERMS.create])}
        canEdit={hasAnyPermission(me.permissions, [...PERMS.edit])}
        canDelete={hasAnyPermission(me.permissions, [...PERMS.delete])}
        initialQuery={listQuery ?? ""}
      />
    </Card>
  );
}
