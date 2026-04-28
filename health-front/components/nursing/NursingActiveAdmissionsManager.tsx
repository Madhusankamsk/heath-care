"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import { SearchablePatientSelect } from "@/components/forms/SearchablePatientSelect";
import { Button } from "@/components/ui/Button";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { NursingAdmissionRow } from "@/components/nursing/types";

type NursingActiveAdmissionsManagerProps = {
  initialAdmissions: NursingAdmissionRow[];
  canManage: boolean;
  canDischarge: boolean;
};

function toDatetimeLocalValue(input?: string | Date) {
  const value = input ? new Date(input) : new Date();
  if (Number.isNaN(value.getTime())) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function NursingActiveAdmissionsManager({
  initialAdmissions,
  canManage,
  canDischarge,
}: NursingActiveAdmissionsManagerProps) {
  const router = useRouter();
  const [admissions, setAdmissions] = useState(initialAdmissions);
  const [patientId, setPatientId] = useState("");
  const [siteLabel, setSiteLabel] = useState("");
  const [admittedAt, setAdmittedAt] = useState(() => toDatetimeLocalValue());
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [admitting, setAdmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [dischargeAtInput, setDischargeAtInput] = useState(() => toDatetimeLocalValue());
  const [dischargeTarget, setDischargeTarget] = useState<{
    id: string;
    patientName: string;
  } | null>(null);

  useEffect(() => {
    setAdmissions(initialAdmissions);
    setPage(1);
  }, [initialAdmissions]);

  const pageSize = 10;
  const filteredAdmissions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return admissions;
    return admissions.filter((row) => {
      const patient = row.patient.fullName.toLowerCase();
      const contact = (row.patient.contactNo ?? "").toLowerCase();
      const site = (row.siteLabel ?? "").toLowerCase();
      const status = (row.statusLookup?.lookupValue ?? "").toLowerCase();
      return patient.includes(q) || contact.includes(q) || site.includes(q) || status.includes(q);
    });
  }, [admissions, query]);
  const total = filteredAdmissions.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = filteredAdmissions.slice(start, start + pageSize);

  async function refresh() {
    const res = await fetch("/api/nursing/admissions/active", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { items?: NursingAdmissionRow[] };
    if (!res.ok) {
      toast.error("Could not refresh admissions");
      return;
    }
    setAdmissions(Array.isArray(data.items) ? data.items : []);
    router.refresh();
  }

  async function admit() {
    if (!patientId.trim()) {
      toast.error("Select a patient.");
      return;
    }
    setAdmitting(true);
    try {
      const res = await fetch("/api/nursing/admissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patientId.trim(),
          siteLabel: siteLabel.trim() || null,
          admittedAt: admittedAt || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to admit");
      toast.success("Patient admitted.");
      setPatientId("");
      setSiteLabel("");
      setAdmittedAt(toDatetimeLocalValue());
      setAdmitModalOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to admit");
    } finally {
      setAdmitting(false);
    }
  }

  async function discharge(admissionId: string, dischargedAt: string) {
    if (!dischargedAt) {
      toast.error("Select discharge date and time.");
      return;
    }
    setBusyId(admissionId);
    try {
      const res = await fetch(`/api/nursing/admissions/${encodeURIComponent(admissionId)}/discharge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dischargedAt }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to discharge");
      toast.success("Patient discharged.");
      setDischargeTarget(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to discharge");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {dischargeTarget ? (
        <ModalShell
          open
          titleId="nursing-discharge-title"
          title="Discharge patient"
          subtitle={`Set discharge date and time for ${dischargeTarget.patientName}.`}
          onClose={() => setDischargeTarget(null)}
        >
          <div className="flex flex-col gap-4">
            <Input
              label="Discharge date and time"
              type="datetime-local"
              value={dischargeAtInput}
              onChange={(e) => setDischargeAtInput(e.target.value)}
            />
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setDischargeTarget(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={busyId === dischargeTarget.id}
                onClick={() => void discharge(dischargeTarget.id, dischargeAtInput)}
              >
                {busyId === dischargeTarget.id ? "Discharging..." : "Confirm discharge"}
              </Button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {admitModalOpen ? (
        <ModalShell
          open
          titleId="nursing-admit-title"
          title="Admit patient"
          subtitle="Search and admit for multi-day in-house nursing on company premises."
          onClose={() => setAdmitModalOpen(false)}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <SearchablePatientSelect label="Patient" value={patientId} onChange={setPatientId} />
            <Input
              label="Site / room (optional)"
              value={siteLabel}
              onChange={(e) => setSiteLabel(e.target.value)}
            />
            <Input
              label="Admit date and time"
              type="datetime-local"
              value={admittedAt}
              onChange={(e) => setAdmittedAt(e.target.value)}
            />
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdmitModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={admitting} onClick={() => void admit()}>
              {admitting ? "Admitting..." : "Admit"}
            </Button>
          </div>
        </ModalShell>
      ) : null}

      <CrudToolbar
        title="Admissions"
        note="Actions are controlled by permissions."
        description="Track active in-house nursing admissions and discharge workflows."
      >
        {canManage ? (
          <Button type="button" variant="create" onClick={() => setAdmitModalOpen(true)}>
            Admit patient
          </Button>
        ) : null}
        <Button
          variant="secondary"
          onClick={async () => {
            await refresh();
          }}
        >
          Refresh
        </Button>
      </CrudToolbar>

      <TableSearchBar
        id="nursing-active-search"
        value={query}
        onChange={(value) => {
          setQuery(value);
          setPage(1);
        }}
        placeholder="Search patient, contact, site, status..."
      />

      <div className="tbl-shell overflow-x-auto">
        {pageRows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-[var(--text-secondary)]">No active admissions.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Admitted At</TableHead>
                <TableHead>Site / Room</TableHead>
                <TableHead>Status</TableHead>
                {canDischarge ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((admission) => (
                <TableRow key={admission.id}>
                  <TableCell>
                    <p className="font-medium text-[var(--text-primary)]">{admission.patient.fullName}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {admission.patient.contactNo ?? "No contact"}
                    </p>
                  </TableCell>
                  <TableCell className="text-[var(--text-primary)]">
                    {formatScheduled(admission.admittedAt)}
                  </TableCell>
                  <TableCell className="text-[var(--text-primary)]">
                    {admission.siteLabel?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-[var(--text-primary)]">
                    {admission.statusLookup?.lookupValue ?? "Admitted"}
                  </TableCell>
                  {canDischarge ? (
                    <TableCell>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="primary"
                          className="h-9 shrink-0 text-xs"
                          disabled={busyId === admission.id}
                          onClick={() => {
                            setDischargeAtInput(toDatetimeLocalValue());
                            setDischargeTarget({
                              id: admission.id,
                              patientName: admission.patient.fullName,
                            });
                          }}
                        >
                          Discharge
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <TablePaginationBar
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={(next) => setPage(next)}
      />
    </div>
  );
}
