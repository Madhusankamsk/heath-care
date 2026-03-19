export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-5 text-sm text-[var(--text-secondary)] sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Moodify Health. All rights reserved.</p>
        <p className="text-xs text-[var(--text-muted)]">
          Built with Next.js + health-back API
        </p>
      </div>
    </footer>
  );
}

