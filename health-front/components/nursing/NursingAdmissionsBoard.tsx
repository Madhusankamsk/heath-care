"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { SearchablePatientSelect } from "@/components/forms/SearchablePatientSelect";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";

type LookupLite = { id: string; lookupKey: string; lookupValue: string };

export type ActiveNursingAdmissionRow = {
  id: string;
  admittedAt: string;
  dischargedAt: string | null;
  siteLabel: string | null;
  statusLookup: LookupLite;
  patient: {
    id: string;
    fullName: string;
    contactNo?: string | null;
    nicOrPassport?: string | null;
  };
  dailyNotes: Array<{ id: string; recordedAt: string; note: string }>;
};

type Props = {
  initialAdmissions: ActiveNursingAdmissionRow[];
  canManage: boolean;
  canDischarge: boolean;
};

export function NursingAdmissionsBoard({ initialAdmissions, canManage, canDischarge }: Props) {
  const router = useRouter();
  const [admissions, setAdmissions] = useState(initialAdmissions);

  useEffect(() => {
    setAdmissions(initialAdmissions);
  }, [initialAdmissions]);
  const [patientId, setPatientId] = useState("");
  const [siteLabel, setSiteLabel] = useState("");
  const [admitting, setAdmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/nursing/admissions/active", { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { items?: ActiveNursingAdmissionRow[] };
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
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to admit");
      toast.success("Patient admitted.");
      setPatientId("");
      setSiteLabel("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to admit");
    } finally {
      setAdmitting(false);
    }
  }

  async function discharge(admissionId: string) {
    setBusyId(admissionId);
    try {
      const res = await fetch(`/api/nursing/admissions/${encodeURIComponent(admissionId)}/discharge`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) throw new Error(data.message || "Unable to discharge");
      toast.success("Patient discharged.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unable to discharge");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Admit patient</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Search and admit for multi-day in-house nursing on company premises.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <SearchablePatientSelect label="Patient" value={patientId} onChange={setPatientId} />
            <Input
              label="Site / room (optional)"
              value={siteLabel}
              onChange={(e) => setSiteLabel(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <Button type="button" variant="primary" disabled={admitting} onClick={() => void admit()}>
              {admitting ? "Admitting…" : "Admit"}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Active admissions</h2>
        {admissions.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">No active admissions.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {admissions.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      {a.patient.fullName}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Admitted {formatScheduled(a.admittedAt)}
                      {a.siteLabel?.trim() ? ` · ${a.siteLabel.trim()}` : ""}
                    </p>
                  </div>
                </div>

                {canDischarge ? (
                  <div className="mt-4 flex justify-end border-t border-[var(--border)] pt-3">
                    <Button
                      type="button"
                      variant="primary"
                      className="h-9 text-xs"
                      disabled={busyId === a.id}
                      onClick={() => void discharge(a.id)}
                    >
                      Discharge
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
