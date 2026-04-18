"use client";

import { Input } from "@/components/ui/Input";

type TableSearchBarProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
};

export function TableSearchBar({
  id = "table-search",
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className = "",
}: TableSearchBarProps) {
  return (
    <div className={`min-w-[12rem] max-w-md flex-1 ${className}`}>
      <Input
        id={id}
        name="q"
        type="search"
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
    </div>
  );
}
