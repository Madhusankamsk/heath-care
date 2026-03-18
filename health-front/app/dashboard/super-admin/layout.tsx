import { redirect } from "next/navigation";

import { Card } from "@/components/Card";
import { SuperAdminTabs } from "@/components/SuperAdminTabs";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { getIsAuthenticated } from "@/lib/auth";
import { canAccessSuperAdmin } from "@/lib/adminAccess";

export default async function SuperAdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  if (!canAccessSuperAdmin(me.user.role, me.permissions)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Super Admin</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          High-privilege settings for system configuration.
        </p>
        <SuperAdminTabs />
      </header>

      <Card>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Signed in as <span className="font-medium">{me.user.email}</span>
          {me.user.role ? (
            <>
              {" "}
              · role: <span className="font-medium">{me.user.role}</span>
            </>
          ) : null}
        </div>
      </Card>

      {children}
    </div>
  );
}

