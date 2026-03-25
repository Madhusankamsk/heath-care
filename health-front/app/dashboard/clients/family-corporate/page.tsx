import { redirect } from "next/navigation";

import {
  SubscriptionAccountManager,
  type SubscriptionAccount,
} from "@/components/admin/SubscriptionAccountManager";
import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["profiles:list", "profiles:read", "patients:read"],
  create: ["profiles:create", "patients:create"],
  edit: ["profiles:update", "patients:update"],
  delete: ["profiles:delete", "patients:delete"],
} as const;

type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type SubscriptionPlanOption = { id: string; planName: string; isActive: boolean };
type PatientOption = { id: string; fullName: string; contactNo?: string | null };

async function getSubscriptionAccounts() {
  return backendJson<SubscriptionAccount[]>("/api/subscription-accounts");
}

async function getSubscriptionPlans() {
  return backendJson<SubscriptionPlanOption[]>("/api/subscription-plans");
}

async function getPatients() {
  return backendJson<PatientOption[]>("/api/patients");
}

async function getLookups(category: string) {
  return backendJson<LookupOption[]>(`/api/lookups?category=${encodeURIComponent(category)}`);
}

export default async function FamilyCorporatePage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canCreate = hasAnyPermission(me.permissions, [...PERMS.create]);
  const canEdit = hasAnyPermission(me.permissions, [...PERMS.edit]);
  const canDelete = hasAnyPermission(me.permissions, [...PERMS.delete]);

  const [accounts, plans, patients, statuses] = await Promise.all([
    getSubscriptionAccounts(),
    getSubscriptionPlans(),
    getPatients(),
    getLookups("SUBSCRIPTION_ACCOUNT_STATUS"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card title="Family/Corporate" description="Manage subscription accounts and memberships.">
        {!accounts ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load subscription accounts.
          </div>
        ) : (
          <SubscriptionAccountManager
            initialAccounts={accounts}
            plans={(plans ?? []).filter((p) => p.isActive)}
            patients={patients ?? []}
            statuses={statuses ?? []}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        )}
      </Card>
    </div>
  );
}

