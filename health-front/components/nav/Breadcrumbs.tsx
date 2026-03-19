"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  clients: "Clients",
  patient: "Patient",
  admin: "Admin",
  staff: "Staff",
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
    <nav className="text-xs text-zinc-500 dark:text-zinc-400">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((c) => (
          <li key={c.href} className="flex items-center gap-1">
            {c.isLast ? (
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {c.label}
              </span>
            ) : (
              <Link className="hover:underline" href={c.href}>
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

