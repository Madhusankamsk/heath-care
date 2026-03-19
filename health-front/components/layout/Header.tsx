import Link from "next/link";
import {
  Crown,
  LayoutDashboard,
  Maximize,
  Menu,
  Minimize,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { UserMenu } from "@/components/auth/UserMenu";
import { canAccessAdmin, canAccessSuperAdmin } from "@/lib/adminAccess";
import { useMe } from "@/lib/useMe";

export type HeaderProps = {
  title?: string;
  isMenuButtonVisible?: boolean;
  onMenuClick?: () => void;
  isFullscreenButtonVisible?: boolean;
};

export function Header({
  title = "Health Dashboard",
  isMenuButtonVisible,
  onMenuClick,
  isFullscreenButtonVisible,
}: HeaderProps) {
  const meState = useMe();
  const canSeeAdmin =
    meState.status === "authenticated"
      ? canAccessAdmin(meState.me.user.role, meState.me.permissions)
      : false;
  const canSeeSuperAdmin =
    meState.status === "authenticated"
      ? canAccessSuperAdmin(meState.me.user.role, meState.me.permissions)
      : false;

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const fullscreenLabel = useMemo(() => {
    return isFullscreen ? "Exit full screen" : "Full screen";
  }, [isFullscreen]);

  async function handleToggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignore: fullscreen may be blocked by browser policy.
    }
  }

  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur">
      <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          {isMenuButtonVisible ? (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] md:hidden"
              aria-label="Open navigation"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-wide text-[var(--text-primary)] hover:text-[var(--brand-primary-strong)]"
          >
            {title}
          </Link>

          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Home
            </Link>
            {canSeeAdmin ? (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden />
                Admin
              </Link>
            ) : null}
            {canSeeSuperAdmin ? (
              <Link
                href="/dashboard/super-admin"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
              >
                <Crown className="h-4 w-4" aria-hidden />
                Super Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {isFullscreenButtonVisible ? (
            <button
              type="button"
              className="hidden h-11 w-11 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)] md:inline-flex"
              aria-label={fullscreenLabel}
              onClick={handleToggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" aria-hidden />
              ) : (
                <Maximize className="h-5 w-5" aria-hidden />
              )}
            </button>
          ) : null}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}

