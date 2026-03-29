import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";

export function teamNameForVehicle(teams: MedicalTeam[], vehicleId: string) {
  const t = teams.find((x) => x.vehicleId === vehicleId);
  if (!t) return null;
  return t.teamName?.trim() || "Unnamed team";
}

export function formatScheduled(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatCrewMemberName(user: {
  fullName: string;
  role?: { id: string; roleName: string } | null;
}) {
  const role = user.role?.roleName?.trim();
  return role ? `${user.fullName} (${role})` : user.fullName;
}
