import { redirect } from "next/navigation";

import {
  SubscriptionAccountManager,
  type SubscriptionAccount,
} from "@/components/admin/SubscriptionAccountManager";
import { type Patient } from "@/components/admin/PatientManager";
import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString, withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["profiles:list", "profiles:read", "patients:read"],
  create: ["profiles:create", "patients:create"],
  edit: ["profiles:update", "patients:update"],
  delete: ["profiles:delete", "patients:delete"],
} as const;

type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type SubscriptionPlanOption = { id: string; planName: string; isActive: boolean };
type PatientOption = Patient;

async function getLookups(category: string) {
  return backendJson<LookupOption[]>(`/api/lookups?category=${encodeURIComponent(category)}`);
}

export default async function FamilyCorporatePage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canCreate = hasAnyPermission(me.permissions, [...PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const q = typeof params.q === "string" ? params.q : "";

  const [accountsResult, plansResult, patientsResult, statuses] = await Promise.all([
    backendJsonPaginated<SubscriptionAccount>(
      `/api/subscription-accounts?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`,
    ),
    backendJsonPaginated<SubscriptionPlanOption>(withPaginationQuery("/api/subscription-plans", 1, 100)),
    backendJsonPaginated<PatientOption>(withPaginationQuery("/api/patients", 1, 100)),
    getLookups("SUBSCRIPTION_ACCOUNT_STATUS"),
  ]);

  const [genders, billingRecipients] = await Promise.all([
    getLookups("GENDER"),
    getLookups("BILLING_RECIPIENT"),
  ]);

  const plans = (plansResult?.items ?? []).filter((p) => p.isActive);
  const patients = patientsResult?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!accountsResult ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load subscription accounts.
          </div>
        ) : (
          <SubscriptionAccountManager
            initialAccounts={accountsResult.items}
            total={accountsResult.total}
            initialPage={accountsResult.page}
            pageSize={accountsResult.pageSize ?? DEFAULT_PAGE_SIZE}
            plans={plans}
            patients={patients}
            genders={genders ?? []}
            billingRecipients={billingRecipients ?? []}
            statuses={statuses ?? []}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            initialQuery={q}
          />
        )}
      </Card>
    </div>
  );
}
