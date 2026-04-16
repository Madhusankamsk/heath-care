import { redirect } from "next/navigation";

import { ForgotPasswordCard } from "@/components/auth/ForgotPasswordCard";
import { getIsAuthenticated } from "@/lib/auth";

export default async function ForgotPasswordPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="safe-auth-page app-shell min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-[calc(4rem+env(safe-area-inset-top,0px))] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Health Front
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Reset your password
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Enter your email and we will send you a reset link.
          </p>
        </header>

        <ForgotPasswordCard />

        <footer className="text-xs text-[var(--text-muted)]">
          By continuing, you agree to the terms of service and privacy policy.
        </footer>
      </div>
    </div>
  );
}
