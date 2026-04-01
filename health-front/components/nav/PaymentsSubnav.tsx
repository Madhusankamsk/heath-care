"use client";

import { SubnavTabs } from "@/components/ui/SubnavTabs";

const TABS = [
  { href: "/dashboard/payments/member", label: "Member payments" },
  { href: "/dashboard/payments/visit", label: "Visit payments" },
  { href: "/dashboard/payments/accounts", label: "Accounts" },
  { href: "/dashboard/payments/collector", label: "Collector" },
] as const;

export function PaymentsSubnav() {
  return <SubnavTabs tabs={TABS} ariaLabel="Payments sections" />;
}
