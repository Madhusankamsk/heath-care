"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SearchablePatientOption = {
  id: string;
  fullName: string;
  shortName?: string | null;
  nicOrPassport?: string | null;
  contactNo?: string | null;
  whatsappNo?: string | null;
};

const searchDropdownTriggerClass =
  "flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-left text-sm text-[var(--text-primary)] outline-none transition hover:border-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

const searchDropdownPanelClass =
  "absolute left-0 right-0 z-[80] mt-1 max-h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg";

export type SearchablePatientSelectProps = {
  label: string;
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
  disabled?: boolean;
  /** When the form already knows the patient (e.g. edit booking), show name until the user searches again. */
  initialPatient?: SearchablePatientOption | null;
  /** Defaults to `/api/patients/search` (Next proxy → backend). */
  searchPath?: string;
};

/**
 * Patient picker with server-side search (same idea as dashboard global search: debounced `q`, min 2 chars).
 */
export function SearchablePatientSelect({
  label,
  value,
  onChange,
  required,
  disabled,
  initialPatient,
  searchPath = "/api/patients/search",
}: SearchablePatientSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState<SearchablePatientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [picked, setPicked] = useState<SearchablePatientOption | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      setPicked(null);
      return;
    }
    if (initialPatient?.id === value) {
      setPicked(initialPatient);
      return;
    }
    setPicked((prev) => (prev?.id === value ? prev : null));
  }, [value, initialPatient]);

  useEffect(() => {
    if (!open) return;
    function handleDoc(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleDoc);
    return () => document.removeEventListener("mousedown", handleDoc);
  }, [open]);

  useEffect(() => {
    if (!open) {
      const timer = window.setTimeout(() => setSearchQ(""), 0);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = searchQ.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setFetchError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    const t = window.setTimeout(() => {
      void fetch(`${searchPath}?q=${encodeURIComponent(trimmed)}`, { cache: "no-store" })
        .then(async (res) => {
          const text = await res.text();
          if (!res.ok) throw new Error(text || "Search failed");
          return JSON.parse(text) as { items?: SearchablePatientOption[] };
        })
        .then((data) => setResults(data.items ?? []))
        .catch((e: unknown) => {
          setResults([]);
          setFetchError(e instanceof Error ? e.message : "Search failed");
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => window.clearTimeout(t);
  }, [searchQ, open, searchPath]);

  const displayPatient = useMemo(() => {
    if (!value) return null;
    if (picked?.id === value) return picked;
    if (initialPatient?.id === value) return initialPatient;
    return null;
  }, [value, picked, initialPatient]);

  const trimmedQ = searchQ.trim();
  const needMoreChars = trimmedQ.length > 0 && trimmedQ.length < 2;
  const showEmpty =
    !loading &&
    !fetchError &&
    trimmedQ.length >= 2 &&
    results.length === 0;

  return (
    <div className="relative flex flex-col gap-2 text-sm" ref={rootRef}>
      <span className="font-medium text-[var(--text-primary)]">
        {label}
        {required ? <span className="text-[var(--danger)]"> *</span> : null}
      </span>
      <button
        type="button"
        disabled={disabled}
        className={searchDropdownTriggerClass + (disabled ? " cursor-not-allowed opacity-60" : "")}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => !disabled && setOpen((o) => !o)}
      >
        <span className="min-w-0 truncate">
          {displayPatient ? displayPatient.fullName : "Select patient…"}
        </span>
        <span className="text-[var(--text-muted)]" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className={searchDropdownPanelClass}>
          <input
            type="search"
            autoComplete="off"
            placeholder="Name, phone, NIC…"
            className="w-full border-b border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            autoFocus
          />
          <div className="max-h-52 overflow-y-auto py-1">
            {loading ? (
              <p className="px-3 py-3 text-xs text-[var(--text-muted)]">Searching…</p>
            ) : null}
            {fetchError ? (
              <p className="px-3 py-2 text-xs text-[var(--danger)]">{fetchError}</p>
            ) : null}
            {!loading && !fetchError && trimmedQ.length === 0 ? (
              <p className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                Enter at least two characters to search.
              </p>
            ) : null}
            {!loading && !fetchError && needMoreChars ? (
              <p className="px-3 py-3 text-xs text-[var(--text-secondary)]">
                Enter at least two characters to search.
              </p>
            ) : null}
            {!loading && !fetchError && showEmpty ? (
              <p className="px-3 py-3 text-xs text-[var(--text-secondary)]">No matches.</p>
            ) : null}
            <ul className="py-1" role="listbox">
              {results.map((p) => (
                <li key={p.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === p.id}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                    onClick={() => {
                      onChange(p.id);
                      setPicked(p);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-[var(--text-primary)]">{p.fullName}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {[p.nicOrPassport, p.contactNo].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
