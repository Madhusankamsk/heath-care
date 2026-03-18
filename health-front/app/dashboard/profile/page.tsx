import { redirect } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";

export default async function ProfilePage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <Card title="Profile" description="Account details (placeholder).">
        <div className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400">Name</span>
            <span className="font-medium text-zinc-950 dark:text-zinc-50">
              {me.user.fullName ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400">Email</span>
            <span className="font-medium text-zinc-950 dark:text-zinc-50">
              {me.user.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-zinc-500 dark:text-zinc-400">Role</span>
            <span className="font-medium text-zinc-950 dark:text-zinc-50">
              {me.user.role ?? "—"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

