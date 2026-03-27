import { redirect } from "next/navigation";

import { PatientManager, type Patient } from "@/components/admin/PatientManager";
import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["patients:list", "patients:read"],
  preview: ["patients:read"],
  create: ["patients:create"],
  edit: ["patients:update"],
  delete: ["patients:delete"],
} as const;

async function getPatients() {
  return backendJson<Patient[]>("/api/patients");
}

type LookupOption = { id: string; lookupKey: string; lookupValue: string };
type SubscriptionPlanOption = { id: string; planName: string; isActive: boolean };
async function getLookups(category: string) {
  return backendJson<LookupOption[]>(`/api/lookups?category=${encodeURIComponent(category)}`);
}
async function getSubscriptionPlans() {
  return backendJson<SubscriptionPlanOption[]>("/api/subscription-plans");
}

export default async function PatientPage({
  searchParams,
}: {
  searchParams?: Promise<{ open?: string }>;
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

  const [patients, genders, billingRecipients, subscriptionPlans, paymentMethods] =
    await Promise.all([
      getPatients(),
      getLookups("GENDER"),
      getLookups("BILLING_RECIPIENT"),
      getSubscriptionPlans(),
      getLookups("PAYMENT_METHOD"),
    ]);
  const subscriptionStatuses = await getLookups("SUBSCRIPTION_ACCOUNT_STATUS");

  return (
    <div className="flex flex-col gap-6">
      <Card title="Patients" description="Actions are controlled by permissions.">
        {!patients ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Failed to load patients.
          </div>
        ) : (
          <PatientManager
            initialPatients={patients}
            genders={genders ?? []}
            billingRecipients={billingRecipients ?? []}
            subscriptionPlans={(subscriptionPlans ?? []).filter((p) => p.isActive)}
            subscriptionStatuses={subscriptionStatuses ?? []}
            paymentMethods={paymentMethods ?? []}
            canPreview={canPreview}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            openCreateOnMount={openCreateOnMount}
          />
        )}
      </Card>
    </div>
  );
}

