"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { toast } from "@/lib/toast";

import { RecordSubscriptionPaymentModal } from "./RecordSubscriptionPaymentModal";

export type OutstandingSubscriptionInvoiceRow = {
  id: string;
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  subscriptionAccountId: string;
  accountName: string | null;
  planName: string;
  patientName: string | null;
  /** PAYMENT_PURPOSE id for this invoice (fixed from plan type; server applies on submit). */
  suggestedPaymentPurposeId: string;
  suggestedPaymentPurposeLabel: string;
};

type LookupOption = { id: string; lookupKey: string; lookupValue: string };

type Props = {
  initialInvoices: OutstandingSubscriptionInvoiceRow[];
  paymentMethods: LookupOption[];
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function RecordSubscriptionPaymentSection({
  initialInvoices,
  paymentMethods,
}: Props) {
  const router = useRouter();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);

  const payRow = payInvoiceId ? (invoices.find((r) => r.id === payInvoiceId) ?? null) : null;

  const refreshInvoices = useCallback(async () => {
    const res = await fetch("/api/subscription-invoices/outstanding", { cache: "no-store" });
    if (!res.ok) {
      toast.error("Could not refresh invoice list");
      return;
    }
    const next = (await res.json()) as OutstandingSubscriptionInvoiceRow[];
    setInvoices(next);
    if (payInvoiceId && !next.some((r) => r.id === payInvoiceId)) {
      setPayInvoiceId(null);
    }
  }, [payInvoiceId]);

  function openPayModal(row: OutstandingSubscriptionInvoiceRow) {
    setPayInvoiceId(row.id);
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-[var(--text-secondary)]">
        No member subscription invoices with a balance due. New registrations create invoices here;
        record payments when money is collected.
      </p>
    );
  }

  if (paymentMethods.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2 text-sm text-[var(--warning)]">
          No payment methods are available (PAYMENT_METHOD lookups). Configure them before recording
          payments.
        </p>
        <div className="tbl-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row) => (
                <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 align-top">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 align-top">{row.accountName ?? "—"}</td>
                  <td className="px-4 py-3 align-top tabular-nums">{row.balanceDue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <CrudToolbar
        title="Member payments"
        note="Actions are controlled by permissions."
        description="Record payments against outstanding subscription invoices for members."
      >
        <Button
          type="button"
          variant="secondary"
          onClick={() => void refreshInvoices()}
        >
          Refresh list
        </Button>
      </CrudToolbar>

      <div className="tbl-shell overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Account</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Paid</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3 text-right">Pay</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((row) => (
              <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="px-4 py-3 align-top">{formatDate(row.createdAt)}</td>
                <td className="px-4 py-3 align-top">{row.accountName ?? "—"}</td>
                <td className="px-4 py-3 align-top">{row.planName}</td>
                <td className="px-4 py-3 align-top">{row.patientName ?? "—"}</td>
                <td className="px-4 py-3 align-top tabular-nums">{row.totalAmount}</td>
                <td className="px-4 py-3 align-top tabular-nums">{row.paidAmount}</td>
                <td className="px-4 py-3 align-top tabular-nums font-medium">{row.balanceDue}</td>
                <td className="px-4 py-3 text-right align-top">
                  <Button
                    type="button"
                    variant="create"
                    className="h-9 px-3 text-xs"
                    onClick={() => openPayModal(row)}
                  >
                    Pay
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RecordSubscriptionPaymentModal
        key={payInvoiceId ?? "closed"}
        open={payRow !== null}
        invoice={payRow}
        paymentMethods={paymentMethods}
        onClose={() => setPayInvoiceId(null)}
        onRecorded={async () => {
          await refreshInvoices();
          router.refresh();
        }}
      />
    </div>
  );
}
