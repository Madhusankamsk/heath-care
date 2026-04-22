"use client";

import { SubnavTabs } from "@/components/ui/SubnavTabs";

const TABS = [
  { href: "/dashboard/in-house/admissions", label: "Admissions" },
  { href: "/dashboard/in-house/doctor", label: "Doctor" },
  { href: "/dashboard/in-house/manage", label: "Manage" },
  { href: "/dashboard/in-house/in-care", label: "In care" },
  { href: "/dashboard/in-house/discharged", label: "Discharged" },
] as const;

export function InHouseSubnav() {
  return <SubnavTabs tabs={TABS} ariaLabel="In-house nursing sections" />;
}
