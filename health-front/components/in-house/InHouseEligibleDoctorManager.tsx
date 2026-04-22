"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import type { StaffProfile } from "@/components/admin/StaffManager";
import { Button } from "@/components/ui/Button";

export type InHouseEligibleRow = {
  userId: string;
  isActive: boolean;
  user: StaffProfile;
};

export function InHouseEligibleDoctorManager(props: {
  profiles: StaffProfile[];
  eligible: InHouseEligibleRow[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setEligible(userId: string, isActive: boolean) {
    setBusyId(userId);
    try {
      const res = await fetch(`/api/in-house/eligible-doctors/${encodeURIComponent(userId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to update");
      toast.success(isActive ? "In-house access updated" : "Marked inactive");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  const rows = props.profiles.filter((p) => p.isActive !== false);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)] text-xs text-[var(--text-muted)]">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Role</th>
            <th className="px-3 py-2 font-medium">In-house eligible</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const el = props.eligible.find((e) => e.userId === p.id);
            return (
              <tr key={p.id} className="border-b border-[var(--border)]/80">
                <td className="px-3 py-2">{p.fullName}</td>
                <td className="px-3 py-2 text-[var(--text-secondary)]">{p.email}</td>
                <td className="px-3 py-2">{p.role?.roleName ?? "—"}</td>
                <td className="px-3 py-2">
                  {el ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-[var(--border)]"
                        checked={el.isActive}
                        disabled={busyId === p.id}
                        onChange={(e) => void setEligible(p.id, e.target.checked)}
                      />
                      <span>{el.isActive ? "Active" : "Inactive"}</span>
                    </label>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-8 px-2 text-xs"
                      disabled={busyId === p.id}
                      onClick={() => void setEligible(p.id, true)}
                    >
                      {busyId === p.id ? "…" : "Add"}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
