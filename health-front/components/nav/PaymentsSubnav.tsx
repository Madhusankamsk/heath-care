"use client";

import { SubnavTabs } from "@/components/ui/SubnavTabs";

const TABS = [
  { href: "/dashboard/payments/invoices", label: "Invoices" },
  { href: "/dashboard/payments/accounts", label: "Accounts" },
  { href: "/dashboard/payments/collector", label: "Collector" },
] as const;

export function PaymentsSubnav() {
  return <SubnavTabs tabs={TABS} ariaLabel="Payments sections" />;
}
