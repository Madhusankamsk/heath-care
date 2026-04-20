"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SearchablePatientSelect } from "@/components/forms/SearchablePatientSelect";
import { Button } from "@/components/ui/Button";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { pageQueryString } from "@/lib/pagination";
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
  whatsappNo?: string | null;
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
  total: number;
  page: number;
  pageSize: number;
  statuses: OpdStatusOption[];
  canCreate: boolean;
  canDelete: boolean;
};

function formatWhen(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getStatusTone(statusKey: string | null | undefined): "success" | "warning" | "danger" | "info" {
  const normalized = (statusKey ?? "").trim().toUpperCase();

  if (normalized.includes("COMPLETE") || normalized.includes("DONE") || normalized.includes("CLOSED")) {
    return "success";
  }
  if (normalized.includes("CANCEL") || normalized.includes("NO_SHOW") || normalized.includes("FAILED")) {
    return "danger";
  }
  if (normalized.includes("WAIT") || normalized.includes("PENDING")) {
    return "warning";
  }
  return "info";
}

function isWaitingStatus(statusKey: string | null | undefined): boolean {
  return (statusKey ?? "").trim().toUpperCase() === "WAITING";
}

export function OpdQueueManager({
  rows,
  total,
  page,
  pageSize,
  statuses,
  canCreate,
  canDelete,
}: OpdQueueManagerProps) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [creating, setCreating] = useState(false);
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

  function goToPage(nextPage: number) {
    router.push(`/dashboard/opd/queue?${pageQueryString(nextPage, pageSize)}`);
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
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Search patients on the server (same as Create booking / dashboard search). Type at least two characters,
          then pick a patient to add to the queue.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <SearchablePatientSelect
              label="Patient"
              value={patientId}
              onChange={setPatientId}
              required
              disabled={!canCreate || creating}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            className="h-11 shrink-0 sm:self-end"
            disabled={!canCreate || creating || !patientId.trim()}
            onClick={() => void addToQueue()}
          >
            {creating ? "Adding..." : "Add to queue"}
          </Button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-sm text-[var(--text-secondary)]">No OPD queue records today.</div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {rows.map((row) => {
              const statusKey = row.statusLookup?.lookupKey ?? row.status;
              const canRemoveRow = canDelete && isWaitingStatus(statusKey);

              return (
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
                      <span
                        className={`pill pill-${getStatusTone(statusKey)} min-h-9 sm:min-w-[10rem] sm:justify-center`}
                      >
                        {row.statusLookup?.lookupValue ?? row.status}
                      </span>
                      {canRemoveRow ? (
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
              );
            })}
          </ul>
        )}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />
        </div>
      </section>
    </div>
  );
}
