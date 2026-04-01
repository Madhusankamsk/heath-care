import { redirect } from "next/navigation";

import { SectionIntro } from "@/components/ui/SectionIntro";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const OPD_VIEW_PERMS = ["opd:list", "opd:read"] as const;

export default async function OpdLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...OPD_VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-2">
      <SectionIntro title="OPD" tag="Outpatient" tagTone="info" />
      {children}
    </div>
  );
}
