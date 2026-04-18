import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

import {
  CollectorDailySettlementSection,
  type CollectorDailySummaryRow,
} from "./CollectorDailySettlementSection";

const VIEW_PERMS = ["invoices:read", "patients:read", "profiles:read"] as const;

type CollectorDailyResponse = {
  date: string;
  items: CollectorDailySummaryRow[];
  total: number;
  page: number;
  pageSize: number;
  grandTotalCollected: number;
  grandPendingSettlement: number;
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function PaymentsCollectorPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; date?: string; q?: string }>;
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
  const selectedDate =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : todayIsoDate();

  const summary = await backendJson<CollectorDailyResponse>(
    `/api/payments/collectors/daily?date=${encodeURIComponent(selectedDate)}&${pageQueryString(pageNum, DEFAULT_PAGE_SIZE, q)}`,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        {!summary ? (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
            Unable to load collector settlements. Check permissions or try again.
          </div>
        ) : (
          <CollectorDailySettlementSection
            initialDate={summary.date || selectedDate}
            initialRows={summary.items ?? []}
            total={summary.total ?? 0}
            initialPage={summary.page ?? pageNum}
            pageSize={summary.pageSize ?? DEFAULT_PAGE_SIZE}
            grandTotalCollected={summary.grandTotalCollected ?? 0}
            grandPendingSettlement={summary.grandPendingSettlement ?? 0}
            initialQuery={q}
          />
        )}
      </Card>
    </div>
  );
}
