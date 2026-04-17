import Link from "next/link";
import { redirect } from "next/navigation";

import type { SubscriptionAccount } from "@/components/admin/SubscriptionAccountManager";
import { FamilyCorporateMembersTable } from "@/components/clients/FamilyCorporateMembersTable";
import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["profiles:list", "profiles:read", "patients:read"],
  detach: ["profiles:update", "patients:update"],
} as const;

export default async function FamilyCorporateFullPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...PERMS.view]);
  if (!canView) redirect("/dashboard");

  const canDetach = hasAnyPermission(me.permissions, [...PERMS.detach]);

  const { id } = await params;
  const account = await backendJson<SubscriptionAccount>(`/api/subscription-accounts/${id}`);
  if (!account) redirect("/dashboard/clients/family-corporate");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard/clients/family-corporate"
          className="inline-flex h-9 items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25"
        >
          Back
        </Link>
        <div className="text-sm text-[var(--text-secondary)]">Full Preview</div>
      </div>

      <Card title="Family/Corporate Account Details" description="Read-only full account preview.">
        <div className="preview-shell sm:grid-cols-2">
          <section className="preview-section">
            <h3 className="preview-section-title">Account</h3>
            <dl className="preview-list">
              <div className="preview-row">
                <dt className="preview-label">Account Name</dt>
                <dd className="preview-value">{account.accountName ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Registration No</dt>
                <dd className="preview-value">{account.registrationNo ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Billing Address</dt>
                <dd className="preview-value">{account.billingAddress ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Plan</dt>
                <dd className="preview-value">{account.plan?.planName ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Status</dt>
                <dd className="preview-value">{account.statusLookup?.lookupValue ?? "—"}</dd>
              </div>
            </dl>
          </section>

          <section className="preview-section">
            <h3 className="preview-section-title">Contact & Dates</h3>
            <dl className="preview-list">
              <div className="preview-row">
                <dt className="preview-label">Contact Email</dt>
                <dd className="preview-value">{account.contactEmail ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Contact Phone</dt>
                <dd className="preview-value">{account.contactPhone ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">WhatsApp No</dt>
                <dd className="preview-value">{account.whatsappNo ?? "—"}</dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Start Date</dt>
                <dd className="preview-value">
                  {account.startDate ? new Date(account.startDate).toISOString().slice(0, 10) : "—"}
                </dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">End Date</dt>
                <dd className="preview-value">
                  {account.endDate ? new Date(account.endDate).toISOString().slice(0, 10) : "—"}
                </dd>
              </div>
              <div className="preview-row">
                <dt className="preview-label">Members</dt>
                <dd className="preview-value">
                  {account.members?.length ?? 0}
                  {account.plan?.maxMembers ? ` / ${account.plan.maxMembers}` : ""}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </Card>

      <Card title="Members" description="Assigned members for this account.">
        <FamilyCorporateMembersTable
          subscriptionAccountId={account.id}
          members={account.members ?? []}
          canDetach={canDetach}
        />
      </Card>
    </div>
  );
}

