import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["invoices:read", "patients:read", "profiles:read"] as const;

type OutstandingInvoiceRow = {
  id: string;
  invoiceType: "MEMBERSHIP" | "VISIT";
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  patientId: string | null;
  patientName: string | null;
  subscriptionAccountId: string | null;
  accountName: string | null;
  planName: string | null;
  bookingId: string | null;
  bookingScheduledDate: string | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function invoiceTypeLabel(invoiceType: OutstandingInvoiceRow["invoiceType"]) {
  return invoiceType === "MEMBERSHIP" ? "Membership" : "Visit";
}

export default async function InvoicesPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const invoices = await backendJson<OutstandingInvoiceRow[]>("/api/invoices/outstanding");

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CrudToolbar
          title="Invoices"
          description="All outstanding invoices with invoice type."
        />
        {!invoices ? (
          <div className="rounded-xl border border-(--danger)/30 bg-(--danger)/10 px-4 py-3 text-sm text-(--danger)">
            Unable to load invoices. Check permissions or try again.
          </div>
        ) : invoices.length === 0 ? (
          <p className="text-sm text-(--text-secondary)">No outstanding invoices.</p>
        ) : (
          <div className="tbl-shell overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Account / booking</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3 text-right">Bill</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="px-4 py-3 align-top">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 align-top">{invoiceTypeLabel(row.invoiceType)}</td>
                    <td className="px-4 py-3 align-top font-mono text-xs">{row.id}</td>
                    <td className="px-4 py-3 align-top">{row.patientName ?? "—"}</td>
                    <td className="px-4 py-3 align-top">
                      {row.invoiceType === "MEMBERSHIP" ? (
                        <div className="flex flex-col gap-0.5">
                          <span>{row.accountName ?? "—"}</span>
                          <span className="text-xs text-(--text-secondary)">{row.planName ?? "—"}</span>
                        </div>
                      ) : (
                        <span>{formatDate(row.bookingScheduledDate)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums">{row.totalAmount}</td>
                    <td className="px-4 py-3 align-top tabular-nums">{row.paidAmount}</td>
                    <td className="px-4 py-3 align-top tabular-nums">{row.balanceDue}</td>
                    <td className="px-4 py-3 text-right align-top">
                      <a
                        className="text-(--brand-primary) underline-offset-2 hover:underline"
                        href={`/api/invoices/${encodeURIComponent(row.id)}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        PDF
                      </a>
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
