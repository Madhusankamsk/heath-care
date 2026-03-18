import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { ThemeToggle } from "@/components/auth/ThemeToggle";
import { canAccessAdmin, canAccessSuperAdmin } from "@/lib/adminAccess";
import { useMe } from "@/lib/useMe";

export type HeaderProps = {
  title?: string;
  isMenuButtonVisible?: boolean;
  onMenuClick?: () => void;
};

export function Header({
  title = "Health Dashboard",
  isMenuButtonVisible,
  onMenuClick,
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

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          {isMenuButtonVisible ? (
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50 md:hidden"
              aria-label="Open navigation"
              onClick={onMenuClick}
            >
              <span className="text-lg leading-none">☰</span>
            </button>
          ) : null}

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-zinc-950 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-200"
          >
            {title}
          </Link>

          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link
              href="/dashboard"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Home
            </Link>
            {canSeeAdmin ? (
              <Link
                href="/dashboard/admin"
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Admin
              </Link>
            ) : null}
            {canSeeSuperAdmin ? (
              <Link
                href="/dashboard/super-admin"
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                Super Admin
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}

