"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type TabItem = {
  href: string;
  label: string;
};

type SubnavTabsProps = {
  tabs: readonly TabItem[];
  ariaLabel: string;
};

export function SubnavTabs({ tabs, ariaLabel }: SubnavTabsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = tabs.find((tab) => pathname === tab.href)?.href ?? tabs[0]?.href ?? "";

  return (
    <>
      <div className="sm:hidden">
        <label className="flex flex-col gap-1.5 text-sm" aria-label={ariaLabel}>
          <select
            value={activeHref}
            onChange={(e) => router.push(e.target.value)}
            aria-label={ariaLabel}
            className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25"
          >
            {tabs.map((tab) => (
              <option key={tab.href} value={tab.href}>
                {tab.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <nav
        className="-mx-1 hidden min-w-0 flex-nowrap gap-2 overflow-x-auto overflow-y-hidden p-1.5 [-webkit-overflow-scrolling:touch] sm:-mx-0 sm:flex sm:flex-wrap sm:overflow-visible"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "inline-flex h-10 shrink-0 items-center justify-center whitespace-nowrap rounded-xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]/25 sm:h-10 sm:px-4 sm:text-sm",
                active
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white shadow-sm"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
