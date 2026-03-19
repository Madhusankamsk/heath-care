"use client";

import { useEffect, useState } from "react";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/nav/Sidebar";

export function DashboardChrome({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    <div className="flex h-screen flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <div className="sticky top-0 z-50">
        <Header
          onMenuClick={() => setIsMobileNavOpen(true)}
          isMenuButtonVisible
          isFullscreenButtonVisible
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((v) => !v)}
        />

        <main className="flex-1 overflow-y-auto bg-[var(--background)]">
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
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            aria-label="Close navigation"
            onClick={() => setIsMobileNavOpen(false)}
          />

          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                onClick={() => setIsMobileNavOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="h-[calc(100%-49px)] overflow-y-auto p-4">
              <Sidebar
                variant="mobile"
                onNavigate={() => setIsMobileNavOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

