"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { SelectBase } from "@/components/ui/select-base";
import { toast } from "@/lib/toast";

type OpdStatusOption = {
  id: string;
  lookupKey: string;
  lookupValue: string;
};

type PatientOption = {
  id: string;
  fullName: string;
  shortName?: string | null;
  nicOrPassport?: string | null;
  contactNo?: string | null;
};

type OpdQueueRow = {
  id: string;
  tokenNo: number;
  visitDate: string;
  patient: PatientOption;
  statusLookup: OpdStatusOption | null;
  status: string;
};

type OpdQueueManagerProps = {
  rows: OpdQueueRow[];
  patients: PatientOption[];
  statuses: OpdStatusOption[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function OpdQueueManager({
  rows,
  patients,
  statuses,
  canCreate,
  canUpdate,
  canDelete,
}: OpdQueueManagerProps) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const waitingStatusId = useMemo(
    () => statuses.find((x) => x.lookupKey === "WAITING")?.id ?? "",
    [statuses],
  );

  async function addToQueue() {
    if (!patientId.trim()) {
      toast.error("Select a patient.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/opd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId.trim(),
          statusLookupId: waitingStatusId || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to add to OPD queue");
      toast.success("Patient added to OPD queue.");
      setPatientId("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to add to queue");
    } finally {
      setCreating(false);
    }
  }

  async function changeStatus(id: string, statusLookupId: string) {
    if (!statusLookupId.trim()) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/opd/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusLookupId }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to update status");
      toast.success("Queue status updated.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeFromQueue(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/opd/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Unable to remove queue record");
      }
      toast.success("Queue record removed.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to remove queue record");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Add Patient to Queue</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Patient
            </span>
            <SelectBase
              value={patientId}
              disabled={!canCreate || creating}
              onChange={(e) => setPatientId(e.target.value)}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                  {p.nicOrPassport ? ` - ${p.nicOrPassport}` : ""}
                </option>
              ))}
            </SelectBase>
          </label>
          <Button
            type="button"
            variant="primary"
            disabled={!canCreate || creating || !patientId.trim()}
            onClick={() => void addToQueue()}
          >
            {creating ? "Adding..." : "Add to queue"}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Today OPD Queue</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[var(--text-secondary)]">No OPD queue records today.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      Token #{row.tokenNo} - {row.patient.fullName}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {row.patient.contactNo ?? "No contact"} - {formatWhen(row.visitDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SelectBase
                      value={row.statusLookup?.id ?? ""}
                      disabled={!canUpdate || updatingId === row.id}
                      onChange={(e) => {
                        void changeStatus(row.id, e.target.value);
                      }}
                      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-[var(--text-primary)] sm:min-w-[10rem]"
                    >
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.lookupValue}
                        </option>
                      ))}
                    </SelectBase>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 px-3 text-xs"
                        disabled={deletingId === row.id}
                        onClick={() => void removeFromQueue(row.id)}
                      >
                        {deletingId === row.id ? "Removing..." : "Remove"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
