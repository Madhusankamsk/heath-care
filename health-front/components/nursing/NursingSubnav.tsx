"use client";

import { SubnavTabs } from "@/components/ui/SubnavTabs";

const TABS = [
  { href: "/dashboard/nursing/board", label: "Admissions" },
  { href: "/dashboard/nursing/discharged-completed", label: "Discharged" },
] as const;

export function NursingSubnav() {
  return <SubnavTabs tabs={TABS} ariaLabel="Nursing sections" />;
}
