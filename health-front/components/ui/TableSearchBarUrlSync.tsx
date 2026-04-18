"use client";

import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { useTableListSearch } from "@/lib/useTableListSearch";

type TableSearchBarUrlSyncProps = {
  initialQuery: string;
  id?: string;
  placeholder?: string;
  label?: string;
  className?: string;
};

/** Search field that syncs `?q=` in the URL (debounced) and resets to page 1 on change. */
export function TableSearchBarUrlSync({
  initialQuery,
  id = "table-search-url",
  placeholder,
  label,
  className,
}: TableSearchBarUrlSyncProps) {
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery);
  return (
    <TableSearchBar
      id={id}
      value={searchInput}
      onChange={setSearchInput}
      placeholder={placeholder}
      label={label}
      className={className}
    />
  );
}
