import { redirect } from "next/navigation";

import { Card } from "@/components/Card";
import { LogoutButton } from "@/components/LogoutButton";
import { getIsAuthenticated } from "@/lib/auth";

export default async function AdminPage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Placeholder admin area (wire RBAC checks next).
            </p>
          </div>
          <LogoutButton />
        </header>

        <Card
          title="Next step"
          description="Use backend roles/permissions endpoints under /api/*."
        >
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            When you’re ready, we can add Next API routes that proxy:
            <ul className="mt-2 list-disc pl-5">
              <li>/api/roles → health-back /api/roles</li>
              <li>/api/permissions → health-back /api/permissions</li>
              <li>/api/profiles → health-back /api/profiles</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}

