"use client";

import { Button } from "@/components/ui/Button";
import { SelectBase } from "@/components/ui/select-base";
import { formatScheduled } from "@/components/dispatch/dispatchDisplay";
import type { UpcomingBookingRow } from "@/components/dispatch/types";
import type { InventoryBatchRow, IssuedMedicineSampleRow } from "@/components/clients/patient-bookings/types";

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
  issuedMedicineSamples,
}: Props) {
  const qtyInt = Number.parseInt(qtyText, 10);
  const selectedBatch = teamLeaderOptions.find((x) => x.id === selectedBatchId) ?? null;
  const qtyInvalid = !Number.isInteger(qtyInt) || qtyInt <= 0;
  const qtyTooHigh = !!selectedBatch && qtyInt > selectedBatch.quantity;

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
          {inventoryFeatureEnabled ? (
            <Button
              type="button"
              variant="secondary"
              className="h-8 px-3 text-xs"
              onClick={onEnsureInventoryLoaded}
            >
              Load
            </Button>
          ) : null}
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
            Click load to view the assigned team leader stock.
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
                  <label className="flex flex-col gap-1 text-xs sm:col-span-2">
                    <span className="font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                      Medicine batch
                    </span>
                    <SelectBase
                      value={selectedBatchId}
                      onChange={(e) => onSelectBatch(e.target.value)}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-primary)]"
                    >
                      <option value="">Select batch</option>
                      {teamLeaderOptions.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.medicine?.name ?? "Medicine"} - {row.batchNo} (stock {row.quantity})
                        </option>
                      ))}
                    </SelectBase>
                  </label>
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
                    {issuingBookingId === b.id ? "Issuing..." : "Issue to patient"}
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
