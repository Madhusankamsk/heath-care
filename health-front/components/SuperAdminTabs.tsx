"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = {
  href: string;
  label: string;
};

const tabs: Tab[] = [
  { href: "/dashboard/super-admin/company-setup", label: "Company Setup" },
];

export function SuperAdminTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={[
              "rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

