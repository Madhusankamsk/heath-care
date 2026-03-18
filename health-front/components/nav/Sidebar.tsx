"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronRight,
  Crown,
  KeyRound,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { canAccessAdmin, canAccessSuperAdmin } from "@/lib/adminAccess";
import { useMe } from "@/lib/useMe";

type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
  children?: { href: string; label: string; icon?: React.ReactNode }[];
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/admin",
    label: "Admin",
    requiresAdmin: true,
    icon: <ShieldCheck className="h-4 w-4" aria-hidden />,
    children: [
      {
        href: "/dashboard/admin/staff",
        label: "Staff",
        icon: <Users className="h-4 w-4" aria-hidden />,
      },
    ],
  },
  {
    href: "/dashboard/super-admin",
    label: "Super Admin",
    requiresSuperAdmin: true,
    icon: <Crown className="h-4 w-4" aria-hidden />,
    children: [
      {
        href: "/dashboard/super-admin/company-setup",
        label: "Company Setup",
        icon: <Building2 className="h-4 w-4" aria-hidden />,
      },
      {
        href: "/dashboard/super-admin/roles",
        label: "Roles",
        icon: <Users className="h-4 w-4" aria-hidden />,
      },
      {
        href: "/dashboard/super-admin/permissions",
        label: "Permissions",
        icon: <KeyRound className="h-4 w-4" aria-hidden />,
      },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

export type SidebarProps = {
  variant?: "desktop" | "mobile";
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
};

export function Sidebar({
  variant = "desktop",
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const meState = useMe();

  const isDesktop = variant === "desktop";
  const isCollapsed = isDesktop && collapsed;
  const canSeeAdmin =
    meState.status === "authenticated"
      ? canAccessAdmin(meState.me.user.role, meState.me.permissions)
      : false;
  const canSeeSuperAdmin =
    meState.status === "authenticated"
      ? canAccessSuperAdmin(meState.me.user.role, meState.me.permissions)
      : false;

  const visibleItems = useMemo(() => {
    return navItems.filter((item) => {
      if (item.requiresAdmin) return canSeeAdmin;
      if (item.requiresSuperAdmin) return canSeeSuperAdmin;
      return true;
    });
  }, [canSeeAdmin, canSeeSuperAdmin]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Auto-expand the group matching the current route.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const item of visibleItems) {
      if (item.children?.length) {
        next[item.href] = pathname.startsWith(item.href);
      }
    }
    setOpenGroups((prev) => ({ ...next, ...prev }));
  }, [pathname, visibleItems]);

  function toggleGroup(href: string) {
    setOpenGroups((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <aside
      className={[
        isDesktop
          ? [
              "hidden shrink-0 border-r border-zinc-200 bg-white/60 backdrop-blur dark:border-zinc-800 dark:bg-black/30 md:block",
              isCollapsed ? "w-20" : "w-64",
            ].join(" ")
          : "w-full",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-full flex-col gap-6",
          isDesktop ? "p-4" : "",
          variant === "mobile" ? "pb-4" : "",
        ].join(" ")}
      >
        <div className="relative px-2 pt-2">
          <p className="pr-10 pt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {isCollapsed ? "Nav" : "Navigation"}
          </p>

          {isDesktop && onToggleCollapsed ? (
            <button
              type="button"
              className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={onToggleCollapsed}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-5 w-5" aria-hidden />
              ) : (
                <PanelLeftClose className="h-5 w-5" aria-hidden />
              )}
            </button>
          ) : null}
        </div>

        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const active = isActive(pathname, item.href);
            const isOpen = Boolean(openGroups[item.href]);

            if (!hasChildren) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  ].join(" ")}
                  onClick={() => onNavigate?.()}
                  title={isCollapsed ? item.label : undefined}
                >
                  {item.icon ? (
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {item.icon}
                    </span>
                  ) : null}
                  {isCollapsed ? null : item.label}
                </Link>
              );
            }

            return (
              <div key={item.href} className="flex flex-col gap-1">
                <button
                  type="button"
                  className={[
                    "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                  ].join(" ")}
                  onClick={() => toggleGroup(item.href)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex items-center gap-2">
                    {item.icon ? (
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {item.icon}
                      </span>
                    ) : null}
                    {isCollapsed ? null : item.label}
                  </span>
                  {isCollapsed ? null : (
                    <ChevronRight
                      className={[
                        "h-4 w-4 text-zinc-500 transition-transform dark:text-zinc-400",
                        isOpen ? "rotate-90" : "",
                      ].join(" ")}
                      aria-hidden
                    />
                  )}
                </button>

                {isCollapsed ? null : isOpen ? (
                  <div className="ml-2 flex flex-col gap-1 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={[
                            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                            childActive
                              ? "bg-zinc-100 text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900",
                          ].join(" ")}
                          onClick={() => onNavigate?.()}
                        >
                          {child.icon ? (
                            <span className="text-zinc-500 dark:text-zinc-400">
                              {child.icon}
                            </span>
                          ) : null}
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        {variant === "mobile" ? (
          <div className="mt-auto flex flex-col gap-2 border-t border-zinc-200 px-2 pt-4 dark:border-zinc-800">
            <ThemeToggle />
            <LogoutButton />
          </div>
        ) : isDesktop ? (
          <div className="mt-auto px-2 pb-2 text-xs text-zinc-500 dark:text-zinc-400">
            Signed-in area
          </div>
        ) : null}
      </div>
    </aside>
  );
}

