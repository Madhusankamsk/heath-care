"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ModalShell } from "@/components/ui/ModalShell";
import { Input } from "@/components/ui/Input";
import { toast } from "@/lib/toast";
import { useEscapeKey } from "@/lib/useEscapeKey";

export type MedicalTeam = {
  id: string;
  teamName: string | null;
  vehicleId: string;
  vehicle: {
    id: string;
    vehicleNo: string;
    model?: string | null;
    status: string;
  };
  members?: {
    id: string;
    isLead: boolean;
    user: {
      id: string;
      fullName: string;
      email: string;
      isActive: boolean;
      role?: { id: string; roleName: string } | null;
    };
  }[];
  _count?: {
    members?: number;
  };
};

type VehicleOption = {
  id: string;
  vehicleNo: string;
  model?: string | null;
  status: string;
};

type MemberOption = {
  id: string;
  fullName: string;
  email: string;
  role?: { id: string; roleName: string } | null;
};

type MedicalTeamManagerProps = {
  initialTeams: MedicalTeam[];
  vehicles: VehicleOption[];
  members: MemberOption[];
  canPreview: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

type Mode = "none" | "create" | "edit" | "preview";

type ActionConfirm = null | { type: "edit" | "delete"; id: string };

export function MedicalTeamManager({
  initialTeams,
  vehicles,
  members,
  canPreview,
  canCreate,
  canEdit,
  canDelete,
}: MedicalTeamManagerProps) {
  const [teams, setTeams] = useState<MedicalTeam[]>(initialTeams);
  const [mode, setMode] = useState<Mode>("none");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionConfirm, setActionConfirm] = useState<ActionConfirm>(null);

  const selected = useMemo(() => {
    if (!selectedId) return null;
    return teams.find((t) => t.id === selectedId) ?? null;
  }, [teams, selectedId]);

  useEscapeKey(
    () => {
      setMode("none");
      setError(null);
    },
    (mode === "create" && canCreate) ||
      (mode === "edit" && canEdit) ||
      (mode === "preview" && canPreview),
  );

  async function refresh() {
    const res = await fetch("/api/medical-teams", { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to refresh medical teams");
    const next = (await res.json()) as MedicalTeam[];
    setTeams(next);
  }

  async function performDelete(id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(`/api/medical-teams/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Not allowed to delete or request failed");
      }
      await refresh();
      toast.success("Medical team deleted");
      if (selectedId === id) {
        setSelectedId(null);
        setMode("none");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ConfirmModal
        open={actionConfirm !== null}
        title={
          actionConfirm?.type === "delete"
            ? "Delete medical team?"
            : "Edit medical team?"
        }
        message={
          actionConfirm?.type === "delete"
            ? "Are you sure you want to delete this medical team? This action cannot be undone."
            : "Are you sure you want to edit this medical team?"
        }
        confirmLabel={actionConfirm?.type === "delete" ? "Delete" : "Continue"}
        confirmVariant={actionConfirm?.type === "delete" ? "delete" : "edit"}
        onCancel={() => setActionConfirm(null)}
        onConfirm={() => {
          if (!actionConfirm) return;
          const { type, id } = actionConfirm;
          setActionConfirm(null);
          if (type === "delete") {
            void performDelete(id);
          } else {
            setSelectedId(id);
            setMode("edit");
            setError(null);
          }
        }}
      />
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage medical teams, assign vehicles, and assign team members.
        </div>
        <div className="flex items-center gap-2">
          {canCreate ? (
            <Button
              variant="create"
              className="h-10 px-4 text-xs sm:text-sm"
              onClick={() => {
                setMode("create");
                setSelectedId(null);
                setError(null);
              }}
            >
              Create medical team
            </Button>
          ) : null}
          <Button
            variant="secondary"
            onClick={async () => {
              setError(null);
              try {
                await refresh();
                toast.success("Medical teams refreshed");
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Something went wrong";
                setError(msg);
                toast.error(msg);
              }
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {mode === "create" && canCreate ? (
        <ModalShell
          open
          titleId="create-medical-team-title"
          title="Create medical team"
          subtitle="Assign a vehicle and team members. Optionally designate a lead."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <MedicalTeamForm
                layout="modal"
                intent="create"
                title="Create medical team"
                submitLabel="Create"
                vehicles={vehicles}
                members={members}
                onCancel={() => {
                  setMode("none");
                  setError(null);
                }}
                onSubmit={async (data) => {
                  setError(null);
                  const res = await fetch("/api/medical-teams", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  if (!res.ok) {
                    const msg = await res.text().catch(() => "");
                    throw new Error(msg || "Create failed");
                  }
                  await refresh();
                  setMode("none");
                  toast.success("Medical team created");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "edit" && selected ? (
        <ModalShell
          open
          titleId="edit-medical-team-title"
          title="Edit medical team"
          subtitle="Update team, vehicle, member, and lead assignments."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <MedicalTeamForm
                layout="modal"
                intent="edit"
                title="Edit medical team"
                submitLabel="Save changes"
                vehicles={vehicles}
                members={members}
                initial={{
                  teamName: selected.teamName ?? "",
                  vehicleId: selected.vehicleId,
                  memberIds: selected.members?.map((member) => member.user.id) ?? [],
                  leadMemberId: selected.members?.find((member) => member.isLead)?.user.id ?? null,
                }}
                onCancel={() => setMode("none")}
                onSubmit={async (data) => {
                  setError(null);
                  const res = await fetch(`/api/medical-teams/${selected.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                  });
                  if (!res.ok) {
                    const msg = await res.text().catch(() => "");
                    throw new Error(msg || "Update failed");
                  }
                  await refresh();
                  setMode("none");
                  toast.success("Medical team updated");
                }}
              />
        </ModalShell>
      ) : null}

      {mode === "preview" && selected ? (
        <ModalShell
          open
          titleId="preview-medical-team-title"
          title="Preview medical team"
          subtitle="Read-only team details."
          maxWidthClass="max-w-3xl"
          onClose={() => {
            setMode("none");
            setError(null);
          }}
        >
          <div className="preview-shell sm:grid-cols-2">
                <section className="preview-section">
                  <h3 className="preview-section-title">Team</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Team name</dt>
                      <dd className="preview-value">{selected.teamName ?? "—"}</dd>
                    </div>
                    <div className="preview-row">
                      <dt className="preview-label">Vehicle</dt>
                      <dd className="preview-value">{selected.vehicle.vehicleNo}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section">
                  <h3 className="preview-section-title">Summary</h3>
                  <dl className="preview-list">
                    <div className="preview-row">
                      <dt className="preview-label">Members</dt>
                      <dd className="preview-value">{selected._count?.members ?? 0}</dd>
                    </div>
                  </dl>
                </section>
                <section className="preview-section sm:col-span-2">
                  <h3 className="preview-section-title">Assigned Members</h3>
                  {!selected.members?.length ? (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      No members assigned.
                    </div>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {selected.members.map((member) => (
                        <li key={member.id} className="text-zinc-700 dark:text-zinc-300">
                          {member.user.fullName} ({member.user.email})
                          {member.isLead ? " - Lead" : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
        </ModalShell>
      ) : null}

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Team Name</th>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Members</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => {
              const isBusy = busyId === team.id;
              return (
                <tr key={team.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium">{team.teamName ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {team.vehicle.vehicleNo}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {team._count?.members ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canPreview ? (
                        <Button
                          type="button"
                          variant="preview"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() => {
                            setSelectedId(team.id);
                            setMode("preview");
                            setError(null);
                          }}
                        >
                          Preview
                        </Button>
                      ) : null}
                      {canEdit ? (
                        <Button
                          type="button"
                          variant="edit"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() =>
                            setActionConfirm({ type: "edit", id: team.id })
                          }
                        >
                          Edit
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="delete"
                          className="h-9 px-3"
                          disabled={isBusy}
                          onClick={() =>
                            setActionConfirm({ type: "delete", id: team.id })
                          }
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type MedicalTeamFormValues = {
  teamName: string;
  vehicleId: string;
  memberIds: string[];
  leadMemberId?: string | null;
};

function MedicalTeamForm({
  title,
  submitLabel,
  intent,
  vehicles,
  members,
  onCancel,
  onSubmit,
  initial,
  layout = "card",
}: {
  title: string;
  submitLabel: string;
  intent: "create" | "edit";
  vehicles: VehicleOption[];
  members: MemberOption[];
  onCancel: () => void;
  onSubmit: (values: MedicalTeamFormValues) => Promise<void>;
  initial?: Partial<MedicalTeamFormValues>;
  layout?: "card" | "modal";
}) {
  const [values, setValues] = useState<MedicalTeamFormValues>({
    teamName: initial?.teamName ?? "",
    vehicleId: initial?.vehicleId ?? vehicles[0]?.id ?? "",
    memberIds: initial?.memberIds ?? [],
    leadMemberId: initial?.leadMemberId ?? null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectClass =
    "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25";

  const formBody = (
    <>
      {layout === "card" ? (
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-[var(--text-primary)]">{title}</div>
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      <form
        className="grid gap-4 sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setIsSubmitting(true);
          try {
            const payload: MedicalTeamFormValues = {
              teamName: values.teamName.trim(),
              vehicleId: values.vehicleId,
              memberIds: values.memberIds,
              leadMemberId:
                values.leadMemberId && values.memberIds.includes(values.leadMemberId)
                  ? values.leadMemberId
                  : null,
            };
            await onSubmit(payload);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Something went wrong";
            setError(msg);
            toast.error(msg);
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <Input
          label="Team Name"
          name="teamName"
          value={values.teamName}
          onChange={(e) => setValues((v) => ({ ...v, teamName: e.target.value }))}
          required
        />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Vehicle</span>
          <select
            className={selectClass}
            value={values.vehicleId}
            onChange={(e) => setValues((v) => ({ ...v, vehicleId: e.target.value }))}
            required
          >
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleNo} ({vehicle.status})
              </option>
            ))}
          </select>
        </label>

        <div className="sm:col-span-2">
          <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">Team Members</div>
          <div className="grid max-h-52 gap-2 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
            {members.map((member) => {
              const checked = values.memberIds.includes(member.id);
              return (
                <label key={member.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const nextIds = e.target.checked
                        ? [...values.memberIds, member.id]
                        : values.memberIds.filter((id) => id !== member.id);
                      const nextLead = nextIds.includes(values.leadMemberId ?? "")
                        ? values.leadMemberId
                        : null;
                      setValues((prev) => ({
                        ...prev,
                        memberIds: [...new Set(nextIds)],
                        leadMemberId: nextLead,
                      }));
                    }}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {member.fullName} ({member.email})
                    {member.role?.roleName ? ` - ${member.role.roleName}` : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-[var(--text-primary)]">Team Lead</span>
          <select
            className={selectClass}
            value={values.leadMemberId ?? ""}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                leadMemberId: e.target.value || null,
              }))
            }
            disabled={!values.memberIds.length}
          >
            <option value="">No lead selected</option>
            {members
              .filter((member) => values.memberIds.includes(member.id))
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.fullName}
                </option>
              ))}
          </select>
        </label>

        <div className="flex items-center justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={intent === "create" ? "create" : "edit"}
            isLoading={isSubmitting}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </>
  );

  if (layout === "modal") {
    return formBody;
  }

  return <div className="surface-card p-6">{formBody}</div>;
}
