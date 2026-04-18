"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { MedicalTeam } from "@/components/admin/MedicalTeamManager";
import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { SelectBase } from "@/components/ui/select-base";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";
import type { PaginatedResult } from "@/lib/pagination";
import { DEFAULT_PAGE_SIZE, pageQueryString } from "@/lib/pagination";
import { useTableListSearch } from "@/lib/useTableListSearch";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";

import { DispatchPreviewPanel } from "./DispatchPreviewPanel";
import { formatScheduled } from "./dispatchDisplay";
import type {
  DispatchMemberCandidate,
  DispatchVehicleOption,
  UpcomingBookingRow,
} from "./types";

export type { DispatchMemberCandidate, DispatchVehicleOption, UpcomingBookingRow };

type UpcomingJobsTableProps = {
  initialRows: UpcomingBookingRow[];
  total: number;
  initialPage: number;
  pageSize?: number;
  teams: MedicalTeam[] | null;
  vehicles: DispatchVehicleOption[] | null;
  /** Active staff for “add to crew” (does not change saved teams). */
  crewCandidates: DispatchMemberCandidate[] | null;
  /** Read-only booking / dispatch details (e.g. `dispatch:read`). */
  canPreview: boolean;
  canAssignTeam: boolean;
  /** Show “Full view” in preview linking to Manage Bookings (`bookings:read`). */
  canFullViewBooking?: boolean;
  initialQuery?: string;
};

export function UpcomingJobsTable({
  initialRows,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  teams,
  vehicles,
  crewCandidates,
  canPreview,
  canAssignTeam,
  canFullViewBooking = false,
  initialQuery = "",
}: UpcomingJobsTableProps) {
  const { searchInput, setSearchInput } = useTableListSearch(initialQuery);
  const [rows, setRows] = useState<UpcomingBookingRow[]>(initialRows);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [dispatchBookingId, setDispatchBookingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"edit" | "preview" | null>(null);
  const [teamId, setTeamId] = useState("");
  /** User ids on this dispatch (team subset + anyone added). */
  const [inCrew, setInCrew] = useState<Set<string>>(() => new Set());
  /** Non–team-roster ids, in add order (for payload after roster picks). */
  const [extrasOrder, setExtrasOrder] = useState<string[]>([]);
  const [addUserId, setAddUserId] = useState("");
  /** For this dispatch only; not written back to the medical team or vehicle record. */
  const [dispatchVehicleId, setDispatchVehicleId] = useState("");
  const [dispatchLeadUserId, setDispatchLeadUserId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const dispatchTarget = useMemo(() => {
    if (!dispatchBookingId) return null;
    return rows.find((r) => r.id === dispatchBookingId) ?? null;
  }, [dispatchBookingId, rows]);

  const teamsWithMembers = useMemo(() => {
    if (!teams?.length) return [];
    return teams.filter((t) => (t.members?.length ?? t._count?.members ?? 0) > 0);
  }, [teams]);

  const selectedTeam = useMemo(() => {
    if (!teamId.trim()) return null;
    return teamsWithMembers.find((t) => t.id === teamId.trim()) ?? null;
  }, [teamId, teamsWithMembers]);

  const rosterUserIds = useMemo(
    () => selectedTeam?.members?.map((m) => m.user.id) ?? [],
    [selectedTeam],
  );

  const teamLeadMember = useMemo(() => {
    const leads = selectedTeam?.members?.filter((m) => m.isLead) ?? [];
    return leads[0] ?? null;
  }, [selectedTeam]);

  const vehiclesSorted = useMemo(() => {
    if (!vehicles?.length) return [];
    return vehicles.slice().sort((a, b) => a.vehicleNo.localeCompare(b.vehicleNo));
  }, [vehicles]);

  const memberUserIdsOrdered = useMemo(() => {
    const fromTeam = rosterUserIds.filter((id) => inCrew.has(id));
    const fromExtras = extrasOrder.filter((id) => inCrew.has(id));
    return [...fromTeam, ...fromExtras];
  }, [rosterUserIds, inCrew, extrasOrder]);

  useEffect(() => {
    if (modalMode !== "edit") return;
    const t = teamsWithMembers.find((x) => x.id === teamId);
    const roster = t?.members?.map((m) => m.user.id) ?? [];
    const docId = dispatchTarget?.requestedDoctor?.id?.trim() ?? "";
    const next = new Set(roster);
    const extras: string[] = [];
    if (docId && !next.has(docId)) {
      next.add(docId);
      extras.push(docId);
    }
    setInCrew(next);
    setExtrasOrder(extras);
    if (t?.vehicleId) {
      setDispatchVehicleId(t.vehicleId);
    } else {
      setDispatchVehicleId("");
    }
  }, [modalMode, teamId, teamsWithMembers, dispatchTarget?.requestedDoctor?.id]);

  useEffect(() => {
    if (memberUserIdsOrdered.length === 0) {
      setDispatchLeadUserId("");
      return;
    }
    setDispatchLeadUserId((prev) => {
      if (prev && memberUserIdsOrdered.includes(prev)) return prev;
      const tl = teamLeadMember?.user.id;
      if (tl && memberUserIdsOrdered.includes(tl)) return tl;
      return memberUserIdsOrdered[0] ?? "";
    });
  }, [memberUserIdsOrdered, teamLeadMember]);

  const labelByUserId = useMemo(() => {
    const m = new Map<string, string>();
    const put = (
      id: string,
      fullName: string,
      role?: { roleName: string } | null,
    ) => {
      const r = role?.roleName?.trim();
      m.set(id, r ? `${fullName} (${r})` : fullName);
    };
    crewCandidates?.forEach((c) => put(c.id, c.fullName, c.role));
    teamsWithMembers.forEach((t) => {
      t.members?.forEach((mem) => put(mem.user.id, mem.user.fullName, mem.user.role));
    });
    const doc = dispatchTarget?.requestedDoctor;
    if (doc?.id) {
      put(doc.id, doc.fullName, null);
    }
    return m;
  }, [crewCandidates, teamsWithMembers, dispatchTarget?.requestedDoctor]);

  useEffect(() => {
    setRows(initialRows);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialRows, initialTotal, initialPage]);

  async function loadPage(nextPage: number) {
    const res = await fetch(
      `/api/dispatch/upcoming?${pageQueryString(nextPage, pageSize, searchInput)}`,
      {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh");
    const data = (await res.json()) as PaginatedResult<UpcomingBookingRow>;
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
  }

  async function goToPage(next: number) {
    try {
      await loadPage(next);
    } catch {
      toast.error("Failed to load page");
    }
  }

  async function refresh() {
    const res = await fetch(`/api/dispatch/upcoming?${pageQueryString(page, pageSize, searchInput)}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to refresh");
    const data = (await res.json()) as PaginatedResult<UpcomingBookingRow>;
    setRows(data.items);
    setTotal(data.total);
    setPage(data.page);
    if (data.items.length === 0 && data.page > 1) {
      await loadPage(data.page - 1);
    }
  }

  const isPreview = modalMode === "preview";
  const modalOpen = dispatchBookingId !== null && modalMode !== null;

  const previewFullViewHref =
    dispatchTarget?.patient?.id != null
      ? `/dashboard/clients/patient/${dispatchTarget.patient.id}`
      : "/dashboard/bookings/manage-bookings";

  function closeModal() {
    setDispatchBookingId(null);
    setModalMode(null);
    setTeamId("");
    setInCrew(new Set());
    setExtrasOrder([]);
    setAddUserId("");
    setDispatchVehicleId("");
    setDispatchLeadUserId("");
  }

  function addStaffToCrew(userId: string) {
    const uid = userId.trim();
    if (!uid) return;
    setInCrew((prev) => new Set(prev).add(uid));
    if (!rosterUserIds.includes(uid)) {
      setExtrasOrder((prev) => [...prev.filter((x) => x !== uid), uid]);
    }
    setAddUserId("");
  }

  function removeFromCrew(userId: string) {
    setInCrew((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setExtrasOrder((prev) => prev.filter((x) => x !== userId));
  }

  const addableCandidates = useMemo(() => {
    if (!crewCandidates?.length) return [];
    return crewCandidates
      .filter((c) => !inCrew.has(c.id))
      .slice()
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [crewCandidates, inCrew]);

  async function submitDispatch() {
    if (!dispatchBookingId || !teamId.trim()) {
      toast.error("Select a medical team");
      return;
    }
    if (!memberUserIdsOrdered.length) {
      toast.error("Add at least one person to the crew");
      return;
    }
    if (!dispatchVehicleId.trim()) {
      toast.error("Select a vehicle for this dispatch");
      return;
    }
    if (!dispatchLeadUserId.trim() || !memberUserIdsOrdered.includes(dispatchLeadUserId)) {
      toast.error("Select a team leader from the crew");
      return;
    }
    setBusyId(dispatchBookingId);
    try {
      const res = await fetch("/api/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: dispatchBookingId,
          medicalTeamId: teamId.trim(),
          vehicleId: dispatchVehicleId.trim(),
          leadUserId: dispatchLeadUserId.trim(),
          memberUserIds: memberUserIdsOrdered,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(data.message || "Dispatch failed");
      }
      toast.success("Team assigned — crew is in transit");
      closeModal();
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Dispatch failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canAssignTeam && teams === null ? (
        <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
          Failed to load medical teams. Assigning a team requires the teams list.
        </p>
      ) : canAssignTeam && teamsWithMembers.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          No medical teams with members. Add teams under Admin → Medical Teams.
        </p>
      ) : null}

      <TableSearchBar
        id="dispatch-upcoming-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Patient, remark, booking id…"
      />

      <div className="tbl-shell overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Patient</TableHead>
              <TableHead>Scheduled</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Remark</TableHead>
              <TableHead>Assigned team</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No upcoming jobs. Accept bookings in Manage Bookings to queue them here.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const latest = row.dispatchRecords[0];
                const showAssignTeam = !latest && canAssignTeam && teamsWithMembers.length > 0;

                return (
                  <TableRow key={row.id} >
                    <TableCell className="font-medium text-[var(--text-primary)]">
                      {row.patient?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {formatScheduled(row.scheduledDate)}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      {row.requestedDoctor?.fullName ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-[var(--text-secondary)]">
                      {row.bookingRemark?.trim() ? row.bookingRemark : "—"}
                    </TableCell>
                    <TableCell className="text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">No team assigned</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {canPreview ? (
                          <Button
                            type="button"
                            variant="preview"
                            className="h-9 px-3"
                            disabled={busyId !== null}
                            onClick={() => {
                              setModalMode("preview");
                              setDispatchBookingId(row.id);
                            }}
                          >
                            Preview
                          </Button>
                        ) : null}
                        {showAssignTeam ? (
                          <Button
                            type="button"
                            variant="edit"
                            className="h-9 px-3"
                            disabled={busyId !== null}
                            onClick={() => {
                              const first = teamsWithMembers[0];
                              setTeamId(first?.id ?? "");
                              setAddUserId("");
                              setDispatchLeadUserId("");
                              setModalMode("edit");
                              setDispatchBookingId(row.id);
                            }}
                          >
                            Assign team
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />

      <ModalShell
        open={modalOpen}
        onClose={closeModal}
        titleId="dispatch-team-title"
        title={isPreview ? "Preview booking" : "Assign team to booking"}
        subtitle={
          isPreview
            ? "Read-only details."
            : dispatchTarget
              ? ""
              : ""
        }
        maxWidthClass="max-w-4xl"
        headerTrailing={
          isPreview && dispatchTarget && canFullViewBooking ? (
            <Link
              href={previewFullViewHref}
              className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-semibold text-[var(--text-primary)] transition-all duration-150 hover:bg-[var(--surface-2)] focus-visible:outline-none active:translate-y-px"
            >
              Full View
            </Link>
          ) : null
        }
      >
        {isPreview && !dispatchTarget ? (
          <p className="text-sm text-[var(--text-secondary)]">
            This booking is no longer in the list. Close and refresh if needed.
          </p>
        ) : null}

        {isPreview && dispatchTarget ? (
          <DispatchPreviewPanel dispatchTarget={dispatchTarget} teams={teams} />
        ) : null}

        {!isPreview ? (
          <div className="flex flex-col gap-4 p-1">
              {crewCandidates === null ? (
                <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                  Could not load staff directory for adding crew. You can still edit the crew list on
                  the right.
                </p>
              ) : null}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
            <div className="flex min-w-0 flex-col gap-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Team, vehicle, and leader (this dispatch)
              </p>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--text-secondary)]">Medical team</span>
                <SelectBase
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)]"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">Select team…</option>
                  {teamsWithMembers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.teamName?.trim() || "Unnamed team"}
                    </option>
                  ))}
                </SelectBase>
              </label>

              {vehicles === null ? (
                <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
                  Vehicles could not be loaded. You need permission to list vehicles to pick one for
                  dispatch.
                </p>
              ) : vehiclesSorted.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No vehicles in the fleet.</p>
              ) : (
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-medium text-[var(--text-secondary)]">
                    Vehicle for this dispatch
                  </span>
                  <SelectBase
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)]"
                    value={dispatchVehicleId}
                    onChange={(e) => setDispatchVehicleId(e.target.value)}
                  >
                    <option value="">Select vehicle…</option>
                    {vehiclesSorted.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNo}
                        {v.model?.trim() ? ` · ${v.model.trim()}` : ""}
                      </option>
                    ))}
                  </SelectBase>
                </label>
              )}

              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-[var(--text-secondary)]">
                  Team leader for this dispatch
                </span>
                <SelectBase
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[var(--text-primary)] disabled:opacity-60"
                  value={dispatchLeadUserId}
                  disabled={memberUserIdsOrdered.length === 0}
                  onChange={(e) => setDispatchLeadUserId(e.target.value)}
                >
                  <option value="">
                    {memberUserIdsOrdered.length === 0 ? "Add crew first…" : "Select leader…"}
                  </option>
                  {memberUserIdsOrdered.map((uid) => (
                    <option key={uid} value={uid}>
                      {labelByUserId.get(uid) ?? uid}
                      {teamLeadMember?.user.id === uid ? " (team’s default lead)" : ""}
                    </option>
                  ))}
                </SelectBase>
              </label>
            </div>

            <div className="flex min-w-0 flex-col gap-4 border-t border-[var(--border)] pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Extra staff and final crew
              </p>
              {crewCandidates && crewCandidates.length > 0 ? (
                <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                  <p className="text-xs font-medium text-[var(--text-primary)]">Add other staff</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[var(--text-secondary)]">
                      Staff member
                      <SelectBase
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-2 text-sm text-[var(--text-primary)]"
                        value={addUserId}
                        onChange={(e) => setAddUserId(e.target.value)}
                      >
                        <option value="">Choose…</option>
                        {addableCandidates.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.fullName}
                            {c.role?.roleName ? ` · ${c.role.roleName}` : ""}
                          </option>
                        ))}
                      </SelectBase>
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      className="shrink-0"
                      disabled={!addUserId.trim() || addableCandidates.length === 0}
                      onClick={() => addStaffToCrew(addUserId)}
                    >
                      Add to crew
                    </Button>
                  </div>
                </div>
              ) : crewCandidates && crewCandidates.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No other active users are available to add beyond the team roster.
                </p>
              ) : null}

              <div className="flex flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <p className="text-xs font-medium text-[var(--text-primary)]">
                  Crew on this dispatch
                </p>
                {memberUserIdsOrdered.length === 0 ? (
                  <p className="mt-1 text-xs text-[var(--text-muted)]">No one selected yet.</p>
                ) : (
                  <ul className="mt-2 flex max-h-[min(18rem,50vh)] flex-col gap-1.5 overflow-y-auto">
                    {memberUserIdsOrdered.map((uid) => (
                      <li
                        key={uid}
                        className="flex items-center justify-between gap-2 rounded-md bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text-secondary)]"
                      >
                        <span className="min-w-0 break-words">{labelByUserId.get(uid) ?? uid}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          className="shrink-0"
                          onClick={() => removeFromCrew(uid)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                busyId !== null ||
                !teamId.trim() ||
                memberUserIdsOrdered.length === 0 ||
                !dispatchVehicleId.trim() ||
                !dispatchLeadUserId.trim() ||
                vehicles === null ||
                vehiclesSorted.length === 0
              }
              onClick={() => void submitDispatch()}
            >
              {busyId === dispatchBookingId ? "Saving…" : "Dispatch"}
            </Button>
          </div>
          </div>
        ) : null}
      </ModalShell>
    </div>
  );
}
