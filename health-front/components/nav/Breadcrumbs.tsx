"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  patient: "Patient",
  accounts: "Accounts",
  payments: "Payments",
  collector: "Collector",
  record: "Record payment",
  member: "Member payments",
  visit: "Visit payments",
  "record-subscription-payment": "Member payments",
  bookings: "Bookings",
  "manage-bookings": "Manage Bookings",
  nursing: "In-house nursing",
  board: "Admissions",
  "discharged-completed": "Discharged",
  dispatching: "Dispatching",
  "upcoming-jobs": "Upcoming jobs",
  "ongoing-jobs": "Ongoing jobs",
  inventory: "Inventory",
  medicines: "Medicines",
  "medical-items": "Medical Items",
  batches: "Batches",
  "mobile-substores": "Mobile Substores",
  "stock-movements": "Stock Movements",
  admin: "Admin",
  staff: "Staff",
  "plan-setup": "Plan Setup",
  "super-admin": "Super Admin",
  "company-setup": "Company Setup",
  roles: "Roles",
  permissions: "Permissions",
  "medical-teams": "Medical Teams",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);

  const crumbs = segments.map((seg, idx) => {
    const href = `/${segments.slice(0, idx + 1).join("/")}`;
    const label = labelMap[seg] ?? seg.replaceAll("-", " ");
    return { href, label, isLast: idx === segments.length - 1 };
  });

  return (
    <nav className="text-xs text-[var(--text-muted)]" aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1">
            {c.isLast ? (
              <span className="font-semibold tracking-wide text-[var(--text-secondary)]">
                {c.label}
              </span>
            ) : (
              <Link className="rounded-md px-1 py-0.5 hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]" href={c.href}>
                {c.label}
              </Link>
            )}
            {c.isLast ? null : <span>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

