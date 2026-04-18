"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Keeps a controlled search field in sync with `?q=` and resets to page 1 when it changes.
 */
export function useTableListSearch(initialQuery: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(initialQuery);

  useEffect(() => {
    setSearchInput(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = searchInput.trim();
      const cur = (searchParams.get("q") ?? "").trim();
      if (next === cur) return;
      const p = new URLSearchParams(searchParams.toString());
      p.set("page", "1");
      if (next) p.set("q", next);
      else p.delete("q");
      router.replace(`${pathname}?${p.toString()}`);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, pathname, router, searchParams]);

  return { searchInput, setSearchInput };
}
