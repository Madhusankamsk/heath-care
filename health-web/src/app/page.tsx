import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/80 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            Mobile Health & Fleet
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50">
            Welcome to the Admin Portal
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to manage staff, roles, and permissions for your mobile healthcare teams.
          </p>
        </div>
        <div className="space-y-4">
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 transition hover:bg-sky-400"
          >
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}
