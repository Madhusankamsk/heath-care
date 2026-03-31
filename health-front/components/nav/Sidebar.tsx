"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Banknote,
  CalendarCheck2,
  Building2,
  ChevronRight,
  Crown,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  Navigation,
  Route,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ShieldCheck,
  Package,
  Stethoscope,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { canAccessAdmin, canAccessSuperAdmin } from "@/lib/adminAccess";
import { hasAnyPermission } from "@/lib/rbac";
import { useMe } from "@/lib/useMe";

type NavLeaf = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresAnyPermissions?: string[];
};

type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  requiresAdmin?: boolean;
  requiresSuperAdmin?: boolean;
  requiresAnyPermissions?: string[];
  children?: NavLeaf[];
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: <LayoutDashboard className="h-4 w-4" aria-hidden />,
  },
  {
    href: "/dashboard/clients",
    label: "Clients",
    icon: <Users className="h-4 w-4" aria-hidden />,
    requiresAnyPermissions: ["patients:list", "patients:read"],
    children: [
      {
        href: "/dashboard/clients/patient",
        label: "Patient",
        icon: <Stethoscope className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["patients:list", "patients:read"],
      },
      {
        href: "/dashboard/clients/family-corporate",
        label: "Family/Corporate",
        icon: <Building2 className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["profiles:list", "profiles:read", "patients:read"],
      },
    ],
  },
  {
    href: "/dashboard/bookings",
    label: "Bookings",
    icon: <CalendarCheck2 className="h-4 w-4" aria-hidden />,
    requiresAnyPermissions: ["bookings:list", "bookings:read"],
    children: [
      {
        href: "/dashboard/bookings/manage-bookings",
        label: "Manage Bookings",
        icon: <CalendarCheck2 className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["bookings:list", "bookings:read"],
      },
    ],
  },
  {
    href: "/dashboard/dispatching",
    label: "Dispatching",
    icon: <Truck className="h-4 w-4" aria-hidden />,
    requiresAnyPermissions: ["dispatch:list", "dispatch:read", "dispatch:update"],
    children: [
      {
        href: "/dashboard/dispatching/upcoming-jobs",
        label: "Upcoming jobs",
        icon: <CalendarCheck2 className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["dispatch:list", "dispatch:read", "dispatch:update"],
      },
      {
        href: "/dashboard/dispatching/ongoing-jobs",
        label: "Ongoing jobs",
        icon: <Route className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["dispatch:list", "dispatch:read", "dispatch:update"],
      },
    ],
  },
  {
    href: "/dashboard/inventory/medicines",
    label: "Inventory",
    icon: <Package className="h-4 w-4" aria-hidden />,
    requiresAnyPermissions: ["inventory:list", "inventory:read"],
  },
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: <Wallet className="h-4 w-4" aria-hidden />,
    requiresAnyPermissions: ["invoices:read", "patients:read", "profiles:read"],
    children: [
      {
        href: "/dashboard/payments/record",
        label: "Record payment",
        icon: <Banknote className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["invoices:read", "patients:read", "profiles:read"],
      },
      {
        href: "/dashboard/payments/accounts",
        label: "Accounts",
        icon: <Receipt className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["invoices:read", "patients:read", "profiles:read"],
      },
      {
        href: "/dashboard/payments/collector",
        label: "Collector",
        icon: <HandCoins className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["invoices:read", "patients:read", "profiles:read"],
      },
    ],
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
        requiresAnyPermissions: ["profiles:list", "profiles:read"],
      },
      {
        href: "/dashboard/admin/vehicles",
        label: "Vehicles",
        icon: <Truck className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["vehicles:list", "vehicles:read"],
      },
      {
        href: "/dashboard/admin/medical-teams",
        label: "Medical Teams",
        icon: <Users className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["medical_teams:list", "medical_teams:read"],
      },
      {
        href: "/dashboard/admin/plan-setup",
        label: "Plan Setup",
        icon: <Users className="h-4 w-4" aria-hidden />,
        requiresAnyPermissions: ["profiles:list", "profiles:read"],
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
  const userPermissions = meState.status === "authenticated" ? meState.me.permissions : undefined;

  const visibleItems = useMemo(() => {
    return navItems
      .filter((item) => {
        if (item.requiresAdmin) return canSeeAdmin;
        if (item.requiresSuperAdmin) return canSeeSuperAdmin;
        if (item.requiresAnyPermissions?.length) {
          return hasAnyPermission(userPermissions, item.requiresAnyPermissions);
        }
        return true;
      })
      .map((item) => {
        if (!item.children?.length) return item;
        const nextChildren = item.children.filter((child) => {
          if (!child.requiresAnyPermissions?.length) return true;
          return hasAnyPermission(userPermissions, child.requiresAnyPermissions);
        });
        return {
          ...item,
          children: nextChildren.length ? nextChildren : undefined,
        };
      });
  }, [canSeeAdmin, canSeeSuperAdmin, userPermissions]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  function toggleGroup(href: string) {
    setOpenGroups((prev) => ({ ...prev, [href]: !prev[href] }));
  }

  return (
    <aside
      className={[
        isDesktop
          ? [
              "hidden h-full shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:block",
              isCollapsed ? "md:w-16 lg:w-20" : "md:w-60 lg:w-64",
            ].join(" ")
          : "h-full w-full",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-full flex-col gap-6",
          isDesktop ? "p-4" : "",
          variant === "mobile" ? "pb-4" : "",
        ].join(" ")}
      >
        <div
          className={[
            "relative px-2 pt-2",
            // When collapsed, the "Navigation" label is hidden but the toggle remains
            // absolutely positioned — reserve vertical space so it doesn't overlap the first icon.
            isCollapsed ? "min-h-11" : "",
          ].join(" ")}
        >
          {isCollapsed ? null : (
            <p className="pr-10 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Navigation
            </p>
          )}

          {isDesktop && onToggleCollapsed ? (
            <button
              type="button"
              className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
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

        <nav
          className={[
            "flex flex-col gap-1",
            isCollapsed ? "pt-2" : "",
          ].join(" ")}
        >
          {visibleItems.map((item) => {
            const hasChildren = Boolean(item.children?.length);
            const active = isActive(pathname, item.href);
            const isOpen = openGroups[item.href] ?? pathname.startsWith(item.href);

            if (!hasChildren) {
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                  onClick={() => onNavigate?.()}
                  title={isCollapsed ? item.label : undefined}
                >
                    {item.icon ? (
                    <span className="text-[var(--text-muted)]">
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
                      ? "bg-[var(--brand-primary)] text-white shadow-sm"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                  onClick={() => toggleGroup(item.href)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="flex items-center gap-2">
                    {item.icon ? (
                      <span className="text-[var(--text-muted)]">
                        {item.icon}
                      </span>
                    ) : null}
                    {isCollapsed ? null : item.label}
                  </span>
                  {isCollapsed ? null : (
                    <ChevronRight
                      className={[
                        "h-4 w-4 text-[var(--text-muted)] transition-transform",
                        isOpen ? "rotate-90" : "",
                      ].join(" ")}
                      aria-hidden
                    />
                  )}
                </button>

                {isCollapsed ? null : isOpen ? (
                  <div className="ml-2 flex flex-col gap-1 border-l border-[var(--border)] pl-2">
                    {item.children!.map((child) => {
                      const childActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={[
                            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                            childActive
                              ? "bg-[var(--surface-3)] text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
                          ].join(" ")}
                          onClick={() => onNavigate?.()}
                        >
                          {child.icon ? (
                            <span className="text-[var(--text-muted)]">{child.icon}</span>
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
          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--border)] px-2 pt-4">
            <ThemeToggle />
            <LogoutButton />
          </div>
        ) : isDesktop ? (
          <div className="mt-auto px-2 pb-2 text-xs text-[var(--text-muted)]">
            Signed-in area
          </div>
        ) : null}
      </div>
    </aside>
  );
}

