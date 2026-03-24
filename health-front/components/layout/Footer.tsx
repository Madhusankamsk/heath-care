export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="flex w-full flex-col gap-2 px-3 py-5 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <p>© {year} Moodify Health. All rights reserved.</p>
        <p className="text-xs text-[var(--text-muted)]">
          Built with Next.js + health-back API
        </p>
      </div>
    </footer>
  );
}

