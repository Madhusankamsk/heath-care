"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export function DashboardChrome({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    }

    if (isMobileNavOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileNavOpen]);

  return (
    <div className="flex h-screen flex-col bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="sticky top-0 z-50">
        <Header
          onMenuClick={() => setIsMobileNavOpen(true)}
          isMenuButtonVisible
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      <div className="sticky bottom-0 z-50">
        <Footer />
      </div>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-60 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                onClick={() => setIsMobileNavOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="h-[calc(100%-49px)] overflow-y-auto p-4">
              <Sidebar variant="mobile" onNavigate={() => setIsMobileNavOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

