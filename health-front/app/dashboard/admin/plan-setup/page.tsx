import { redirect } from "next/navigation";

import {
  SubscriptionPlanManager,
  type SubscriptionPlan,
} from "@/components/admin/SubscriptionPlanManager";
import { Card } from "@/components/ui/Card";
import { canAccessAdmin } from "@/lib/adminAccess";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type PlanTypeOption = { id: string; lookupKey: string; lookupValue: string };

const PERMS = {
  view: ["profiles:list", "profiles:read"],
  create: ["profiles:create"],
  edit: ["profiles:update"],
  delete: ["profiles:delete"],
} as const;

async function getSubscriptionPlanTypes() {
  return backendJson<PlanTypeOption[]>("/api/subscription-plan-types");
}

export default async function AdminPlanSetupPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");
  if (!canAccessAdmin(me.user.role, me.permissions)) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canCreate = hasAnyPermission(me.permissions, [...PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [plansResult, planTypes] = await Promise.all([
    backendJsonPaginated<SubscriptionPlan>(
      `/api/subscription-plans?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, listQuery)}`,
    ),
    getSubscriptionPlanTypes(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!plansResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load subscription plans.
          </div>
        ) : !planTypes ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load subscription plan types.
          </div>
        ) : (
          <SubscriptionPlanManager
            initialPlans={plansResult.items}
            total={plansResult.total}
            initialPage={plansResult.page}
            pageSize={plansResult.pageSize ?? DEFAULT_PAGE_SIZE}
            planTypes={planTypes}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}

