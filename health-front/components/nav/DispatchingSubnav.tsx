"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/dispatching/upcoming-jobs", label: "Upcoming jobs" },
  { href: "/dashboard/dispatching/ongoing-jobs", label: "Ongoing jobs" },
] as const;

export function DispatchingSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-3">
      <nav
        className="flex flex-wrap gap-1 border-b border-[var(--border)]"
        aria-label="Dispatching sections"
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--brand-primary)] text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
