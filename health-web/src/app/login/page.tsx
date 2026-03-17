"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // TODO: integrate Supabase auth and store access token,
      // then call your backend with the JWT in Authorization header.
      await new Promise((resolve) => setTimeout(resolve, 800));

      console.log("Login attempt", { email, password: password ? "***" : "" });
      // For now we just log; you can redirect with router.push("/dashboard") after real auth.
    } catch (err) {
      console.error(err);
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/80 backdrop-blur">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
            Staff Sign In
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50">
            Login to your account
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Use your work email to access the mobile healthcare control panel.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              className="block w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-500/40"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              Password
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="block w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-50 outline-none ring-2 ring-transparent transition focus:border-sky-400 focus:ring-sky-500/40"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-rose-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-full bg-sky-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-lg shadow-sky-500/40 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          By continuing, you agree to the internal use policy of this healthcare system.
        </p>
      </div>
    </main>
  );
}

