export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-zinc-200 bg-white/60 backdrop-blur dark:border-zinc-800 dark:bg-black/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-zinc-600 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <p>© {year} Moodify Health. All rights reserved.</p>
        <p className="text-xs">Built with Next.js + health-back API</p>
      </div>
    </footer>
  );
}

