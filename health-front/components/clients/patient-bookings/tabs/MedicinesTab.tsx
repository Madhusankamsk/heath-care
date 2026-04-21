"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type {
  InventoryBatchRow,
  IssuedMedicineSampleRow,
  QueuedMedicineRow,
} from "@/components/clients/patient-bookings/types";

function medicineBatchMatchesQuery(row: InventoryBatchRow, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const medicineName = row.medicine?.name ?? "Medicine";
  return `${medicineName} ${row.batchNo} ${row.quantity}`.toLowerCase().includes(s);
}

type Props = {
  b: UpcomingBookingRow;
  active: boolean;
  inventoryFeatureEnabled: boolean;
  inventoryError: string | null;
  inventoryBatches: InventoryBatchRow[] | null;
  onEnsureInventoryLoaded: () => void;
  teamLeaderName: string;
  teamLeaderOptions: InventoryBatchRow[];
  selectedBatchId: string;
  onSelectBatch: (batchId: string) => void;
  qtyText: string;
  onChangeQty: (qty: string) => void;
  issuingBookingId: string | null;
  onIssueMedicine: () => void;
  queuedMedicines: QueuedMedicineRow[];
  onRemoveQueuedMedicine: (queuedId: string) => void;
  issuedMedicineSamples: IssuedMedicineSampleRow[];
};

export function MedicinesTab({
  b,
  active,
  inventoryFeatureEnabled,
  inventoryError,
  inventoryBatches,
  onEnsureInventoryLoaded,
  teamLeaderName,
  teamLeaderOptions,
  selectedBatchId,
  onSelectBatch,
  qtyText,
  onChangeQty,
  issuingBookingId,
  onIssueMedicine,
  queuedMedicines,
  onRemoveQueuedMedicine,
  issuedMedicineSamples,
}: Props) {
  const [batchDropdownOpen, setBatchDropdownOpen] = useState(false);
  const [batchQuery, setBatchQuery] = useState("");
  const batchRootRef = useRef<HTMLDivElement>(null);
  const qtyInt = Number.parseInt(qtyText, 10);
  const selectedBatch = teamLeaderOptions.find((x) => x.id === selectedBatchId) ?? null;
  const qtyInvalid = !Number.isInteger(qtyInt) || qtyInt <= 0;
  const qtyTooHigh = !!selectedBatch && qtyInt > selectedBatch.quantity;

  useEffect(() => {
    if (!active || !inventoryFeatureEnabled || inventoryBatches !== null) return;
    onEnsureInventoryLoaded();
  }, [active, inventoryFeatureEnabled, inventoryBatches, onEnsureInventoryLoaded]);

  const filteredBatchOptions = useMemo(
    () => teamLeaderOptions.filter((row) => medicineBatchMatchesQuery(row, batchQuery)),
    [teamLeaderOptions, batchQuery],
  );

  useEffect(() => {
    if (!batchDropdownOpen) return;
    function handleDoc(e: MouseEvent) {
      if (batchRootRef.current && !batchRootRef.current.contains(e.target as Node)) {
        setBatchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDoc);
    return () => document.removeEventListener("mousedown", handleDoc);
  }, [batchDropdownOpen]);

  useEffect(() => {
    if (!batchDropdownOpen) {
      const timer = window.setTimeout(() => setBatchQuery(""), 0);
      return () => window.clearTimeout(timer);
    }
  }, [batchDropdownOpen]);

  return (
    <div
      role="tabpanel"
      id={`patient-booking-${b.id}-panel-medicines`}
      hidden={!active}
      className="px-3 py-3"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Team leader mobile inventory
          </span>
        </div>

        {!inventoryFeatureEnabled ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            Issuing medicines requires dispatch update access.
          </p>
        ) : inventoryError ? (
          <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
            {inventoryError}
          </p>
        ) : inventoryBatches === null ? (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-secondary)]">
            Loading assigned team leader stock...
          </p>
        ) : (
          <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-sm text-[var(--text-secondary)]">
              Team leader: <span className="font-medium text-[var(--text-primary)]">{teamLeaderName}</span>
            </p>
            {teamLeaderOptions.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No available medicine batches in this team leader&apos;s mobile store.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="relative flex flex-col gap-1 text-xs sm:col-span-2" ref={batchRootRef}>
                    <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Medicine batch
                    </span>
                    <button
                      type="button"
                      className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-left text-sm text-[var(--text-primary)] outline-none transition hover:border-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25"
                      aria-expanded={batchDropdownOpen}
                      aria-haspopup="listbox"
                      onClick={() => setBatchDropdownOpen((o) => !o)}
                    >
                      <span className="min-w-0 truncate">
                        {selectedBatch
                          ? `${selectedBatch.medicine?.name ?? "Medicine"} - ${selectedBatch.batchNo} (stock ${selectedBatch.quantity})`
                          : "Select batch"}
                      </span>
                      <span className="text-[var(--text-muted)]" aria-hidden>
                        ▾
                      </span>
                    </button>
                    {batchDropdownOpen ? (
                      <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-64 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                        <input
                          type="search"
                          autoComplete="off"
                          placeholder="Search medicines..."
                          className="w-full border-b border-[var(--border)] bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                          value={batchQuery}
                          onChange={(e) => setBatchQuery(e.target.value)}
                          autoFocus
                        />
                        <ul className="max-h-52 overflow-y-auto py-1" role="listbox">
                          {filteredBatchOptions.length === 0 ? (
                            <li className="px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
                              No matches
                            </li>
                          ) : (
                            filteredBatchOptions.map((row) => (
                              <li key={row.id} role="none">
                                <button
                                  type="button"
                                  role="option"
                                  aria-selected={selectedBatchId === row.id}
                                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
                                  onClick={() => {
                                    onSelectBatch(row.id);
                                    setBatchDropdownOpen(false);
                                  }}
                                >
                                  <span className="font-medium text-[var(--text-primary)]">
                                    {row.medicine?.name ?? "Medicine"}
                                  </span>
                                  <span className="text-xs text-[var(--text-muted)]">
                                    Batch {row.batchNo} · Stock {row.quantity}
                                  </span>
                                </button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                  <label className="flex flex-col gap-1 text-xs">
                    <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Qty
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={qtyText}
                      onChange={(e) => onChangeQty(e.target.value)}
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 text-sm text-[var(--text-primary)]"
                    />
                  </label>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedBatch
                      ? `Available: ${selectedBatch.quantity} ${selectedBatch.medicine?.uom?.trim() || "units"}`
                      : "Select a batch to issue medicine"}
                  </p>
                  <Button
                    type="button"
                    variant="primary"
                    className="h-8 px-3 text-xs"
                    disabled={issuingBookingId === b.id || !selectedBatchId || qtyInvalid || qtyTooHigh}
                    onClick={onIssueMedicine}
                  >
                    {issuingBookingId === b.id ? "Adding..." : "Add to bill"}
                  </Button>
                </div>
                {qtyTooHigh ? (
                  <p className="text-xs text-[var(--danger)]">Quantity is higher than available stock.</p>
                ) : null}
              </>
            )}
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Queued medicines for bill
          </div>
          {queuedMedicines.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[var(--text-muted)]">
              No medicines queued for billing.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {queuedMedicines.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">{row.medicineName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Batch {row.batchNo} · Qty {row.quantity} {row.unitLabel}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-7 px-2 text-xs"
                    onClick={() => onRemoveQueuedMedicine(row.id)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Issued medicines
          </div>
          {issuedMedicineSamples.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[var(--text-muted)]">No medicines issued yet.</div>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {issuedMedicineSamples.map((s) => (
                <li key={s.id} className="px-3 py-2 text-sm">
                  <p className="font-medium text-[var(--text-primary)]">{s.sampleType}</p>
                  <p className="text-[var(--text-secondary)]">{s.labName?.trim() ? s.labName : "—"}</p>
                  <p className="text-xs text-[var(--text-muted)]">{formatScheduled(s.collectedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
