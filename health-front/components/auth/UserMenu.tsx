"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, UserCircle } from "lucide-react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { useMe } from "@/lib/useMe";

export function UserMenu() {
  const meState = useMe();
  const displayName = useMemo(() => {
    if (meState.status !== "authenticated") return "Account";
    return meState.me.user.fullName?.trim() || meState.me.user.email || "Account";
  }, [meState]);

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <UserCircle className="h-5 w-5" aria-hidden />
        <span className="max-w-40 truncate">{displayName}</span>
        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-xl"
        >
          <Link
            href="/dashboard/profile"
            role="menuitem"
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            onClick={() => setOpen(false)}
          >
            <UserCircle className="h-4 w-4" aria-hidden />
            Profile
          </Link>

          <div className="my-2 h-px bg-[var(--border)]" />

          <div className="flex flex-col gap-1">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      ) : null}
    </div>
  );
}

