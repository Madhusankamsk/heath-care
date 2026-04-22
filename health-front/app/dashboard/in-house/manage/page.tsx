import { redirect } from "next/navigation";

import type { StaffProfile } from "@/components/admin/StaffManager";
import { InHouseEligibleDoctorManager } from "@/components/in-house/InHouseEligibleDoctorManager";
import { Card } from "@/components/ui/Card";
import { getIsAuthenticated } from "@/lib/auth";
import { backendJson, type BackendMeResponse } from "@/lib/backend";
import { withPaginationQuery } from "@/lib/pagination";
import { hasAnyPermission } from "@/lib/rbac";

type EligibleApi = {
  userId: string;
  isActive: boolean;
  user: {
    id: string;
    fullName: string;
    email: string;
    isActive: boolean;
    role: { roleName: string } | null;
  };
};

export default async function InHouseManagePage() {
  const isAuthenticated = await getIsAuthenticated();
  if (!isAuthenticated) redirect("/");

  const me = await backendJson<BackendMeResponse>("/api/me");
  if (!me) redirect("/dashboard");

  const canManage = hasAnyPermission(me.permissions, ["inhouse:manage_doctors"]);
  if (!canManage) redirect("/dashboard/in-house/admissions");

  const [profilesResult, eligible] = await Promise.all([
    backendJson<{ items: StaffProfile[]; total: number }>(
      withPaginationQuery("/api/profiles", 1, 200),
    ),
    backendJson<EligibleApi[]>("/api/in-house/eligible-doctors"),
  ]);

  const profiles = profilesResult?.items ?? [];
  const eligibleRows =
    eligible?.map((e) => ({
      userId: e.userId,
      isActive: e.isActive,
      user: {
        id: e.user.id,
        fullName: e.user.fullName,
        email: e.user.email,
        isActive: e.user.isActive,
        role: e.user.role ? { id: "", roleName: e.user.role.roleName } : null,
      } satisfies StaffProfile,
    })) ?? [];

  return (
    <Card
      title="In-house doctor eligibility"
      description="Choose which staff accounts may use the in-house doctor queue and pick patients."
    >
      {!profilesResult || !eligible ? (
        <p className="text-sm text-red-700 dark:text-red-300">Failed to load data.</p>
      ) : (
        <InHouseEligibleDoctorManager profiles={profiles} eligible={eligibleRows} />
      )}
    </Card>
  );
}
