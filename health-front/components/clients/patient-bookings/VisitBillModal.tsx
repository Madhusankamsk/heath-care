"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ModalShell } from "@/components/ui/ModalShell";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { totalPages } from "@/lib/pagination";

const BILL_PAGE_SIZE = 2;

const DUMMY_BILL_LINES: { label: string; amount: number }[] = [
  { label: "Consultation / visit fee", amount: 1200 },
  { label: "Diagnostic & lab services", amount: 850 },
  { label: "Medicines dispensed", amount: 420 },
  { label: "GST (18%)", amount: 444.6 },
];

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
  completeDisabled: boolean;
  onComplete: () => void;
};

export function VisitBillModal({
  open,
  onClose,
  bookingId,
  patientDisplayName,
  completeDisabled,
  onComplete,
}: VisitBillModalProps) {
  const billTotal = DUMMY_BILL_LINES.reduce((sum, row) => sum + row.amount, 0);
  const [page, setPage] = useState(1);
  const linePages = totalPages(DUMMY_BILL_LINES.length, BILL_PAGE_SIZE);
  const lineSlice = useMemo(() => {
    const safe = Math.min(Math.max(1, page), linePages);
    const start = (safe - 1) * BILL_PAGE_SIZE;
    return DUMMY_BILL_LINES.slice(start, start + BILL_PAGE_SIZE);
  }, [page, linePages]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId={`patient-booking-${bookingId}-bill-modal-title`}
      title="Bill preview"
      subtitle="Sample charges for this visit. Confirm when you are ready to complete."
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
            {lineSlice.map((row) => (
              <tr key={row.label} className="border-b border-[var(--border)]/80">
                <td className="py-2 pr-2 text-[var(--text-secondary)]">{row.label}</td>
                <td className="py-2 text-right tabular-nums">{formatInr(row.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-[var(--text-primary)]">
              <td className="pt-3">Total</td>
              <td className="pt-3 text-right tabular-nums">{formatInr(billTotal)}</td>
            </tr>
          </tfoot>
        </table>
        {DUMMY_BILL_LINES.length > BILL_PAGE_SIZE ? (
          <TablePaginationBar
            page={page}
            pageSize={BILL_PAGE_SIZE}
            total={DUMMY_BILL_LINES.length}
            onPageChange={setPage}
          />
        ) : null}
        <p className="text-[10px] leading-relaxed text-[var(--text-muted)]">
          This is a placeholder bill for workflow preview. Final invoicing may differ.
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
