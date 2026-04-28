"use client";

import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/nav/Sidebar";
import { useEscapeKey } from "@/lib/useEscapeKey";

const MOBILE_NAV_TITLE_ID = "mobile-nav-drawer-title";

export function DashboardChrome({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);
  const prevMobileNavOpenRef = useRef(false);

  function closeMobileNav() {
    setIsMobileNavOpen(false);
  }

  useEscapeKey(closeMobileNav, isMobileNavOpen);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const id = window.requestAnimationFrame(() => {
      drawerCloseRef.current?.focus();
    });

    return () => {
      window.cancelAnimationFrame(id);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (prevMobileNavOpenRef.current && !isMobileNavOpen) {
      window.requestAnimationFrame(() => {
        menuButtonRef.current?.focus();
      });
    }
    prevMobileNavOpenRef.current = isMobileNavOpen;
  }, [isMobileNavOpen]);

  return (
    <div className="app-shell flex h-screen flex-col text-[var(--text-primary)]">
      <div className="sticky top-0 z-50">
        <Header
          menuButtonRef={menuButtonRef}
          isMobileNavOpen={isMobileNavOpen}
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

        <main
          className="min-w-0 flex-1 overflow-y-auto"
          data-app-scroll-root
        >
          <div className="safe-chrome-main mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>

      {isMobileNavOpen ? (
        <div className="fixed inset-0 z-60 md:hidden">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            aria-hidden="true"
            onClick={closeMobileNav}
            role="presentation"
          />

          <div
            className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-[var(--border)] bg-[var(--surface)] pt-[env(safe-area-inset-top,0px)] shadow-[var(--shadow-strong)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={MOBILE_NAV_TITLE_ID}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-4">
              <h2
                id={MOBILE_NAV_TITLE_ID}
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
                Menu
              </h2>
              <button
                ref={drawerCloseRef}
                type="button"
                className="min-h-11 min-w-11 rounded-lg px-2 py-1 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                onClick={closeMobileNav}
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4 pl-[max(1rem,env(safe-area-inset-left,0px))]">
              <Sidebar
                variant="mobile"
                onNavigate={closeMobileNav}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
