import Link from "next/link";
import { redirect } from "next/navigation";

import type { SubscriptionAccount } from "@/components/admin/SubscriptionAccountManager";
import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const PERMS = {
  view: ["profiles:list", "profiles:read", "patients:read"],
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
        <div className="tbl-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">NIC/Passport</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Joined At</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(account.members ?? []).length === 0 ? (
                <tr className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-4 text-[var(--text-secondary)]" colSpan={5}>
                    No members assigned yet.
                  </td>
                </tr>
              ) : (
                (account.members ?? []).map((m) => (
                  <tr key={m.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 font-medium">{m.patient?.fullName ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {m.patient?.nicOrPassport ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {m.patient?.contactNo ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                      {m.joinedAt ? new Date(m.joinedAt).toISOString().slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.patient?.id ? (
                        <Link
                          href={`/dashboard/clients/patient/${m.patient.id}`}
                          className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                        >
                          Full View
                        </Link>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

