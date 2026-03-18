import { redirect } from "next/navigation";

import { LoginCard } from "@/components/auth/LoginCard";
import { getIsAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (isAuthenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-6 py-16 text-zinc-950 dark:from-zinc-950 dark:to-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Health Front
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Sign in to your account
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sign in using credentials from the backend.
          </p>
        </header>

        <LoginCard />

        <footer className="text-xs text-zinc-500 dark:text-zinc-500">
          By continuing, you agree to the terms of service and privacy policy.
        </footer>
      </div>
    </div>
  );
}
