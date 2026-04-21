"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import type { QueuedMedicineRow } from "@/components/clients/patient-bookings/types";
import { totalPages } from "@/lib/pagination";

const BILL_PAGE_SIZE = 2;

type BillLine = { label: string; amount: number };

function formatInr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(n);
}

export type VisitBillModalProps = {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  patientDisplayName: string;
  queuedMedicines: QueuedMedicineRow[];
  completeDisabled: boolean;
  onComplete: () => void;
};

export function VisitBillModal({
  open,
  onClose,
  bookingId,
  patientDisplayName,
  queuedMedicines,
  completeDisabled,
  onComplete,
}: VisitBillModalProps) {
  const billLines: BillLine[] = useMemo(
    () =>
      queuedMedicines.map((row) => ({
        label: `${row.medicineName} (batch ${row.batchNo}) x ${row.quantity}`,
        amount: row.quantity * row.unitPrice,
      })),
    [queuedMedicines],
  );
  const billTotal = billLines.reduce((sum, row) => sum + row.amount, 0);
  const [page, setPage] = useState(1);
  const linePages = totalPages(billLines.length, BILL_PAGE_SIZE);
  const lineSlice = useMemo(() => {
    const safe = Math.min(Math.max(1, page), linePages);
    const start = (safe - 1) * BILL_PAGE_SIZE;
    return billLines.slice(start, start + BILL_PAGE_SIZE);
  }, [billLines, page, linePages]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId={`patient-booking-${bookingId}-bill-modal-title`}
      title="Bill preview"
      subtitle="Queued medicines for this visit. Confirm to persist medicines and complete."
      maxWidthClass="max-w-lg"
    >
      <div className="flex flex-col gap-4 text-sm text-[var(--text-primary)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-xs">
          <p className="font-semibold text-[var(--text-primary)]">{patientDisplayName}</p>
          <p className="mt-1 text-[var(--text-muted)]">
            Booking ref:{" "}
            <span className="font-mono text-[var(--text-secondary)]">{bookingId.slice(0, 8)}…</span>
          </p>
        </div>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
              <th className="py-2 pr-2 font-medium">Description</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineSlice.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-4 text-center text-[var(--text-muted)]">
                  No medicines added yet.
                </td>
              </tr>
            ) : (
              lineSlice.map((row) => (
                <tr key={row.label} className="border-b border-[var(--border)]/80">
                  <td className="py-2 pr-2 text-[var(--text-secondary)]">{row.label}</td>
                  <td className="py-2 text-right tabular-nums">{formatInr(row.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-[var(--text-primary)]">
              <td className="pt-3">Total</td>
              <td className="pt-3 text-right tabular-nums">{formatInr(billTotal)}</td>
            </tr>
          </tfoot>
        </table>
        {billLines.length > BILL_PAGE_SIZE ? (
          <TablePaginationBar
            page={page}
            pageSize={BILL_PAGE_SIZE}
            total={billLines.length}
            onPageChange={setPage}
          />
        ) : null}
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          Medicines are saved to the database only after you click Complete.
        </p>
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">
          <Button
            type="button"
            variant="secondary"
            className="h-9 px-4 text-xs font-medium"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            className="h-9 px-4 text-xs font-medium"
            disabled={completeDisabled}
            onClick={() => {
              onClose();
              onComplete();
            }}
          >
            Complete
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
