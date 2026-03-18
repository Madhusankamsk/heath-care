import Link from "next/link";

import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export type HeaderProps = {
  title?: string;
};

export function Header({ title = "Health Dashboard" }: HeaderProps) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/50">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
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
            <Link
              href="/dashboard/admin"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Admin
            </Link>
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

