import { redirect } from "next/navigation";

import { Breadcrumbs } from "@/components/Breadcrumbs";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { canAccessAdmin } from "@/lib/adminAccess";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  if (!canAccessAdmin(me.user.role, me.permissions)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <Breadcrumbs />
        <h1 className="text-lg font-semibold tracking-tight">Admin</h1>
      </div>
      {children}
    </div>
  );
}

