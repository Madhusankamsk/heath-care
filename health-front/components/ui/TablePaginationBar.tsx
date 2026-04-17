"use client";

import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { totalPages } from "@/lib/pagination";

type TablePaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Client-side page changes */
  onPageChange?: (nextPage: number) => void;
  /** Server / Link navigation: return href for a 1-based page number */
  hrefForPage?: (page: number) => string;
  className?: string;
};

export function TablePaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  hrefForPage,
  className = "",
}: TablePaginationBarProps) {
  const pages = totalPages(total, pageSize);
  const safePage = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  const prevDisabled = safePage <= 1;
  const nextDisabled = safePage >= pages;

  const nav = (delta: number) => {
    const next = safePage + delta;
    if (next < 1 || next > pages) return;
    onPageChange?.(next);
  };

  return (
    <div
      className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-xs text-[var(--text-secondary)]">
        {total === 0
          ? "No rows"
          : `Showing ${from}–${to} of ${total} · Page ${safePage} of ${pages}`}
      </p>
      <div className="flex items-center gap-2">
        {hrefForPage ? (
          <>
            <Link
              href={hrefForPage(Math.max(1, safePage - 1))}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                prevDisabled && "pointer-events-none opacity-60",
              )}
              aria-disabled={prevDisabled}
            >
              Previous
            </Link>
            <Link
              href={hrefForPage(Math.min(pages, safePage + 1))}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                nextDisabled && "pointer-events-none opacity-60",
              )}
              aria-disabled={nextDisabled}
            >
              Next
            </Link>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={prevDisabled}
              onClick={() => nav(-1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              disabled={nextDisabled}
              onClick={() => nav(1)}
            >
              Next
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
