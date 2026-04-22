"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type InvoiceTypeFilterValue = "all" | "membership" | "visit" | "opd" | "in_house";

const selectClass =
  "h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] shadow-xs outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30";

export function InvoiceTypeFilter({
  initialType,
  id = "invoice-type-filter",
}: {
  initialType: InvoiceTypeFilterValue;
  id?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function onChange(nextType: InvoiceTypeFilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (nextType === "all") params.delete("type");
    else params.set("type", nextType);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]" htmlFor={id}>
      Type
      <select
        id={id}
        className={selectClass}
        value={initialType}
        onChange={(event) => onChange(event.target.value as InvoiceTypeFilterValue)}
      >
        <option value="all">All invoices</option>
        <option value="membership">Membership invoices</option>
        <option value="visit">Visit invoices</option>
        <option value="opd">OPD invoices</option>
        <option value="in_house">In-house nursing invoices</option>
      </select>
    </label>
  );
}
