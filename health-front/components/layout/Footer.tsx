export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/75 backdrop-blur-md">
      <div className="safe-chrome-footer flex w-full flex-col gap-1 text-sm leading-snug text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Health Scan. All rights reserved.</p>
        <p className="text-xs text-[var(--text-muted)]">
          Built with Next.js + health-back API
        </p>
      </div>
    </footer>
  );
}

