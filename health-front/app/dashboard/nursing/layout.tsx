import { redirect } from "next/navigation";

import { NursingSubnav } from "@/components/nursing/NursingSubnav";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const NURSING_VIEW_PERMS = ["nursing:list", "nursing:read"] as const;

export default async function NursingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...NURSING_VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-4">
      <SectionIntro title="In-house nursing" tag="Inpatient" tagTone="info" />
      <NursingSubnav />
      {children}
    </div>
  );
}
