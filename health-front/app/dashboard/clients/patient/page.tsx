import { redirect } from "next/navigation";

import { PatientManager, type Patient } from "@/components/admin/PatientManager";
import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["patients:list", "patients:read"],
  preview: ["patients:read"],
  create: ["patients:create"],
  edit: ["patients:update"],
  delete: ["patients:delete"],
} as const;

async function getPatientsPage(pageNum: number, q?: string) {
  return backendJsonPaginated<Patient>(`/api/patients?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`);
}

type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type SubscriptionPlanOption = { id: string; planName: string; isActive: boolean };
async function getLookups(category: string) {
  return backendJson<LookupOption[]>(`/api/lookups?category=${encodeURIComponent(category)}`);
}
async function getSubscriptionPlans() {
  return backendJsonPaginated<SubscriptionPlanOption>(
    withPaginationQuery("/api/subscription-plans", 1, 100),
  );
}

export default async function PatientPage({
  searchParams,
}: {
  searchParams?: Promise<{ open?: string; page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canPreview = hasAnyPermission(me.permissions, [...PERMS.preview]);
  const canCreate = hasAnyPermission(me.permissions, [...PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);
  const params = (await searchParams) ?? {};
  const openCreateOnMount = params.open === "create";
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const listQuery = typeof params.q === "string" ? params.q : undefined;

  const [patientsResult, genders, billingRecipients, subscriptionPlansResult] = await Promise.all([
    getPatientsPage(pageNum, listQuery),
    getLookups("GENDER"),
    getLookups("BILLING_RECIPIENT"),
    getSubscriptionPlans(),
  ]);
  const subscriptionPlans = subscriptionPlansResult?.items ?? [];
  const subscriptionStatuses = await getLookups("SUBSCRIPTION_ACCOUNT_STATUS");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!patientsResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load patients.
          </div>
        ) : (
          <PatientManager
            initialPatients={patientsResult.items}
            total={patientsResult.total}
            initialPage={patientsResult.page}
            pageSize={patientsResult.pageSize ?? DEFAULT_PAGE_SIZE}
            genders={genders ?? []}
            billingRecipients={billingRecipients ?? []}
            subscriptionPlans={(subscriptionPlans ?? []).filter((p) => p.isActive)}
            subscriptionStatuses={subscriptionStatuses ?? []}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            openCreateOnMount={openCreateOnMount}
            initialQuery={listQuery ?? ""}
          />
        )}
      </Card>
    </div>
  );
}

