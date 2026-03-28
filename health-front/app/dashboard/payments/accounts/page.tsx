import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["invoices:read", "patients:read", "profiles:read"] as const;

export type PaymentListRow = {
  id: string;
  paidAt: string;
  amountPaid: string;
  transactionRef: string | null;
  paymentMethod: string;
  invoiceId: string;
  patientId: string | null;
  patientName: string;
  subscriptionAccountId: string | null;
  subscriptionAccountName: string | null;
  planName: string | null;
  collectedById: string;
  collectedByName: string;
};

async function getPayments() {
  return backendJson<PaymentListRow[]>("/api/payments");
}

function formatPaidAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function PaymentsAccountsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const payments = await getPayments();

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Accounts"
        description="Recorded invoice payments (including subscription billing). Up to 200 most recent."
      >
        {!payments ? (
          <div className="text-sm text-red-700 dark:text-red-300">
            Unable to load payments. Check permissions or try again.
          </div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--text-secondary)]">
                  <th className="pb-2 pr-4 font-medium">Paid</th>
                  <th className="pb-2 pr-4 font-medium">Amount</th>
                  <th className="pb-2 pr-4 font-medium">Method</th>
                  <th className="pb-2 pr-4 font-medium">Patient</th>
                  <th className="pb-2 pr-4 font-medium">Account / plan</th>
                  <th className="pb-2 pr-4 font-medium">Reference</th>
                  <th className="pb-2 pr-4 font-medium">Collected by</th>
                  <th className="pb-2 font-medium">Bill</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-[var(--border)]/60 text-[var(--text-primary)] last:border-0"
                  >
                    <td className="py-2 pr-4 align-top">{formatPaidAt(row.paidAt)}</td>
                    <td className="py-2 pr-4 align-top tabular-nums">{row.amountPaid}</td>
                    <td className="py-2 pr-4 align-top">{row.paymentMethod}</td>
                    <td className="py-2 pr-4 align-top">{row.patientName}</td>
                    <td className="py-2 pr-4 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span>{row.subscriptionAccountName ?? "—"}</span>
                        {row.planName ? (
                          <span className="text-xs text-[var(--text-secondary)]">{row.planName}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-top text-[var(--text-secondary)]">
                      {row.transactionRef ?? "—"}
                    </td>
                    <td className="py-2 pr-4 align-top">{row.collectedByName}</td>
                    <td className="py-2 align-top">
                      {row.subscriptionAccountId ? (
                        <a
                          className="text-[var(--brand-primary)] underline-offset-2 hover:underline"
                          href={`/api/invoices/${encodeURIComponent(row.invoiceId)}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          PDF
                        </a>
                      ) : (
                        <span className="text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
