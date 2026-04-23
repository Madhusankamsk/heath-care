import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { backendJson, backendJsonPaginated, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

import { OutstandingPaymentsSection, type OutstandingInvoiceRow } from "./OutstandingPaymentsSection";

const VIEW_PERMS = ["invoices:read", "patients:read", "profiles:read"] as const;

type LookupOption = { id: string; lookupKey: string; lookupValue: string };

export default async function OutstandingPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; q?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const pageNum = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const q = typeof params.q === "string" ? params.q : "";

  const [result, paymentMethods] = await Promise.all([
    backendJsonPaginated<OutstandingInvoiceRow>(
      `/api/invoices/outstanding?${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`,
    ),
    backendJson<LookupOption[]>(`/api/lookups?category=${encodeURIComponent("PAYMENT_METHOD")}`),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!result ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            Unable to load outstanding payment records. Check permissions or try again.
          </div>
        ) : (
          <OutstandingPaymentsSection
            initialInvoices={result.items}
            total={result.total}
            initialPage={result.page}
            pageSize={result.pageSize ?? DEFAULT_PAGE_SIZE}
            initialQuery={q}
            paymentMethods={paymentMethods ?? []}
          />
        )}
      </Card>
    </div>
  );
}

