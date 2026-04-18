"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { InputBase } from "@/components/ui/input-base";

type GlobalSearchHit = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type GlobalSearchResponse = {
  patients: GlobalSearchHit[];
  bookings: GlobalSearchHit[];
};

export function DashboardGlobalSearch({ canSearch }: { canSearch: boolean }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<GlobalSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    const t = setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetch(`/api/dashboard/global-search?q=${encodeURIComponent(trimmed)}`, {
        cache: "no-store",
      })
        .then(async (res) => {
          const text = await res.text();
          if (!res.ok) {
            throw new Error(text || "Search failed");
          }
          return JSON.parse(text) as GlobalSearchResponse;
        })
        .then(setData)
        .catch((e: unknown) => {
          setData(null);
          setError(e instanceof Error ? e.message : "Search failed");
        })
        .finally(() => setLoading(false));
    }, 350);

    return () => clearTimeout(t);
  }, [query]);

  if (!canSearch) {
    return null;
  }

  const hasResults =
    data != null && (data.patients.length > 0 || data.bookings.length > 0);
  const showHint = query.trim().length > 0 && query.trim().length < 2;

  return (
    <Card title="Search patients and bookings">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm">
          <div className="relative flex">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 z-1 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <InputBase
              id="dashboard-global-search"
              name="dashboard-global-search"
              type="search"
              className="w-full pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, phone, NIC, booking id…"
              autoComplete="off"
            />
          </div>
        </div>

        {showHint ? (
          <p className="text-sm text-[var(--text-secondary)]">Enter at least two characters to search.</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Searching…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-[var(--danger)]">{error}</p>
        ) : null}

        {!loading && !error && data && query.trim().length >= 2 && !hasResults ? (
          <p className="text-sm text-[var(--text-muted)]">No matches.</p>
        ) : null}

        {hasResults ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data!.patients.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Patients
                </h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {data!.patients.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:bg-[var(--surface-2)]"
                      >
                        <div className="font-medium text-[var(--text-primary)]">{row.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{row.subtitle}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {data!.bookings.length > 0 ? (
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Bookings
                </h3>
                <ul className="flex flex-col gap-2 text-sm">
                  {data!.bookings.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={row.href}
                        className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 transition hover:bg-[var(--surface-2)]"
                      >
                        <div className="font-medium text-[var(--text-primary)]">{row.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{row.subtitle}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
