"use client";

import { useEffect } from "react";

type CompanySettingsDto = {
  primaryColor: string | null;
  secondaryColor: string | null;
} | null;

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  if (!v.startsWith("#")) return null;
  if (v.length === 4 || v.length === 7) return v;
  return null;
}

function applyBranding(settings: CompanySettingsDto) {
  const primary = normalizeHexColor(settings?.primaryColor);
  const secondary = normalizeHexColor(settings?.secondaryColor);
  if (primary) {
    document.documentElement.style.setProperty("--brand-primary", primary);
    document.documentElement.style.setProperty("--brand-primary-strong", primary);
  }
  if (secondary) {
    document.documentElement.style.setProperty("--brand-secondary", secondary);
  }
}

export function CompanyBrandingSync() {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/company-settings", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as CompanySettingsDto;
        if (cancelled) return;
        applyBranding(json);
      } catch {
        // ignore
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

