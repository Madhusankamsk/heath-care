import { redirect } from "next/navigation";

import { InHouseSubnav } from "@/components/in-house/InHouseSubnav";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { hasAnyPermission } from "@/lib/rbac";

const VIEW_PERMS = ["inhouse:list", "inhouse:read"] as const;

export default async function InHouseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canView = hasAnyPermission(me.permissions, [...VIEW_PERMS]);
  if (!canView) redirect("/dashboard");

  return (
    <div className="flex flex-col gap-4">
      <SectionIntro title="In-House" tag="Nursing" tagTone="info" />
      <InHouseSubnav />
      {children}
    </div>
  );
}
