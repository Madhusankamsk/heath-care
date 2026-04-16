import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { Card } from "@/components/ui/Card";
import { ShadButton } from "@/components/ui/Button";
import { getIsAuthenticated } from "@/lib/auth";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const isAuthenticated = await getIsAuthenticated();
  if (isAuthenticated) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <div className="safe-auth-page app-shell min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom,0px))] pt-[calc(4rem+env(safe-area-inset-top,0px))] text-[var(--text-primary)]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Health Front
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            New password
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Use the link from your email to choose a new password.
          </p>
        </header>

        {!token ? (
          <Card title="Invalid link" description="This reset link is missing a token.">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-secondary)]">
                Request a new reset link from the forgot password page.
              </p>
              <ShadButton asChild variant="secondary">
                <Link href="/forgot-password">Forgot password</Link>
              </ShadButton>
            </div>
          </Card>
        ) : (
          <ResetPasswordCard token={token} />
        )}

        <footer className="text-xs text-[var(--text-muted)]">
          By continuing, you agree to the terms of service and privacy policy.
        </footer>
      </div>
    </div>
  );
}
