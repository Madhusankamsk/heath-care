"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { canAccessAdmin, canAccessSuperAdmin } from "@/lib/adminAccess";
import { useMe } from "@/lib/useMe";

type NavItem = {
  href: string;
  label: string;
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/admin", label: "Admin", requiresAdmin: true },
  {
    href: "/dashboard/super-admin",
    label: "Super Admin",
    requiresSuperAdmin: true,
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export type SidebarProps = {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
};

export function Sidebar({ variant = "desktop", onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const meState = useMe();

  const isDesktop = variant === "desktop";
  const canSeeAdmin =
    meState.status === "authenticated"
      ? canAccessAdmin(meState.me.user.role, meState.me.permissions)
      : false;
  const canSeeSuperAdmin =
    meState.status === "authenticated"
      ? canAccessSuperAdmin(meState.me.user.role, meState.me.permissions)
      : false;

  return (
    <aside
      className={[
        isDesktop
          ? "hidden w-64 shrink-0 border-r border-zinc-200 bg-white/60 backdrop-blur dark:border-zinc-800 dark:bg-black/30 md:block"
          : "w-full",
      ].join(" ")}
    >
      <div className={["flex h-full flex-col gap-6", isDesktop ? "p-4" : ""].join(" ")}>
        <div className="px-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Navigation
          </p>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems
            .filter((item) => {
              if (item.requiresAdmin) return canSeeAdmin;
              if (item.requiresSuperAdmin) return canSeeSuperAdmin;
              return true;
            })
            .map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                ].join(" ")}
                onClick={() => onNavigate?.()}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isDesktop ? (
          <div className="mt-auto px-2 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Signed-in area
          </div>
        ) : null}
      </div>
    </aside>
  );
}

