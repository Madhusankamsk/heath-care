import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { hasAnyPermission } from "@/lib/rbac";

import { RecordVisitPaymentSection } from "./RecordVisitPaymentSection";
import type { OutstandingVisitInvoiceRow } from "./visitInvoiceTypes";

const VIEW_PERMS = ["invoices:read", "patients:read", "profiles:read"] as const;

type LookupOption = { id: string; lookupKey: string; lookupValue: string };

export default async function VisitPaymentsPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const [invoices, paymentMethods] = await Promise.all([
    backendJson<OutstandingVisitInvoiceRow[]>("/api/visit-invoices/outstanding"),
    backendJson<LookupOption[]>("/api/lookups?category=PAYMENT_METHOD"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Visit payments"
        description="Apply payments to home-visit invoices that still have a balance. Invoices are created when a visit is completed from dispatch."
      >
        {!invoices || !paymentMethods ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            Unable to load data. Check permissions or try again.
          </div>
        ) : (
          <RecordVisitPaymentSection initialInvoices={invoices} paymentMethods={paymentMethods} />
        )}
      </Card>
    </div>
  );
}
