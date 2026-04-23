"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CrudToolbar } from "@/components/ui/CrudToolbar";
import { Input } from "@/components/ui/Input";
import { ModalShell } from "@/components/ui/ModalShell";
import { TablePaginationBar } from "@/components/ui/TablePaginationBar";
import { TableSearchBar } from "@/components/ui/TableSearchBar";
import { DEFAULT_PAGE_SIZE, pageQueryString, type PaginatedResult } from "@/lib/pagination";
import { toast } from "@/lib/toast";

type LookupOption = { id: string; lookupKey: string; lookupValue: string };

export type OutstandingInvoiceRow = {
  id: string;
  invoiceType: "MEMBERSHIP" | "VISIT" | "OPD";
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  patientName: string | null;
  accountName: string | null;
  planName: string | null;
  bookingScheduledDate: string | null;
};

type Props = {
  initialInvoices: OutstandingInvoiceRow[];
  total: number;
  initialPage: number;
  pageSize?: number;
  initialQuery?: string;
  paymentMethods: LookupOption[];
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function invoiceTypeLabel(invoiceType: OutstandingInvoiceRow["invoiceType"]) {
  if (invoiceType === "MEMBERSHIP") return "Membership";
  if (invoiceType === "OPD") return "OPD";
  return "Visit";
}

function paymentEndpointForRow(row: OutstandingInvoiceRow) {
  if (row.invoiceType === "MEMBERSHIP") {
    return `/api/subscription-invoices/${encodeURIComponent(row.id)}/payments`;
  }
  if (row.invoiceType === "OPD") {
    return `/api/opd-invoices/${encodeURIComponent(row.id)}/payments`;
  }
  return `/api/visit-invoices/${encodeURIComponent(row.id)}/payments`;
}

export function OutstandingPaymentsSection({
  initialInvoices,
  total: initialTotal,
  initialPage,
  pageSize = DEFAULT_PAGE_SIZE,
  initialQuery = "",
  paymentMethods,
}: Props) {
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(initialPage);
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState(paymentMethods[0]?.id ?? "");
  const [transactionRef, setTransactionRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const payRow = payInvoiceId ? (invoices.find((r) => r.id === payInvoiceId) ?? null) : null;

  useEffect(() => {
    setInvoices(initialInvoices);
    setTotal(initialTotal);
    setPage(initialPage);
  }, [initialInvoices, initialTotal, initialPage]);

  useEffect(() => {
    if (!payRow) return;
    setAmount(payRow.balanceDue);
    setPaymentMethodId(paymentMethods[0]?.id ?? "");
    setTransactionRef("");
  }, [payRow?.id, paymentMethods]);

  const refreshInvoices = useCallback(
    async (targetPage: number, q: string) => {
      const res = await fetch(`/api/invoices/outstanding?${pageQueryString(targetPage, pageSize, q)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        toast.error("Could not refresh outstanding records");
        return;
      }
      let data = (await res.json()) as PaginatedResult<OutstandingInvoiceRow>;
      if (data.items.length === 0 && data.page > 1) {
        const fallbackPage = data.page - 1;
        const res2 = await fetch(
          `/api/invoices/outstanding?${pageQueryString(fallbackPage, pageSize, q)}`,
          { cache: "no-store" },
        );
        if (res2.ok) {
          data = (await res2.json()) as PaginatedResult<OutstandingInvoiceRow>;
        }
      }
      setInvoices(data.items);
      setTotal(data.total);
      setPage(data.page);
      if (payInvoiceId && !data.items.some((r) => r.id === payInvoiceId)) {
        setPayInvoiceId(null);
      }
    },
    [pageSize, payInvoiceId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      void refreshInvoices(1, searchInput);
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput, refreshInvoices]);

  async function goToPage(nextPage: number) {
    await refreshInvoices(nextPage, searchInput);
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payRow) return;
    if (!paymentMethodId.trim()) {
      toast.error("Select a payment method");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(paymentEndpointForRow(payRow), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: amount.trim(),
          paymentMethodId: paymentMethodId.trim(),
          transactionRef: transactionRef.trim() || undefined,
        }),
      });
      const raw = await res.text().catch(() => "");
      if (!res.ok) {
        let msg = raw || "Payment failed";
        try {
          const j = JSON.parse(raw) as { message?: string };
          if (j.message) msg = j.message;
        } catch {
          /* keep raw */
        }
        throw new Error(msg);
      }
      toast.success("Payment recorded");
      setPayInvoiceId(null);
      await refreshInvoices(page, searchInput);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CrudToolbar
        title="Outstanding payments"
        description="Track outstanding invoices and record collected payments."
      >
        <Button type="button" variant="secondary" onClick={() => void refreshInvoices(page, searchInput)}>
          Refresh list
        </Button>
      </CrudToolbar>

      <TableSearchBar
        id="outstanding-payments-search"
        value={searchInput}
        onChange={setSearchInput}
        placeholder="Invoice id, patient, account…"
      />

      {paymentMethods.length === 0 ? (
        <p className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2 text-sm text-[var(--warning)]">
          No payment methods are available (PAYMENT_METHOD lookups). Configure them before recording
          payments.
        </p>
      ) : null}

      {!invoices.length ? (
        <p className="text-sm text-[var(--text-secondary)]">No outstanding payment records.</p>
      ) : (
        <div className="tbl-shell overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Account / booking</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3 text-right">Bill</th>
                <th className="px-4 py-3 text-right">Pay</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row) => (
                <tr key={row.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-4 py-3 align-top">{formatDate(row.createdAt)}</td>
                  <td className="px-4 py-3 align-top">{invoiceTypeLabel(row.invoiceType)}</td>
                  <td className="px-4 py-3 align-top font-mono text-xs">{row.id}</td>
                  <td className="px-4 py-3 align-top">{row.patientName ?? "—"}</td>
                  <td className="px-4 py-3 align-top">
                    {row.invoiceType === "MEMBERSHIP" ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{row.accountName ?? "—"}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{row.planName ?? "—"}</span>
                      </div>
                    ) : (
                      <span>{formatDate(row.bookingScheduledDate)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top tabular-nums">{row.totalAmount}</td>
                  <td className="px-4 py-3 align-top tabular-nums">{row.paidAmount}</td>
                  <td className="px-4 py-3 align-top tabular-nums font-medium">{row.balanceDue}</td>
                  <td className="px-4 py-3 text-right align-top">
                    <a
                      className="text-[var(--brand-primary)] underline-offset-2 hover:underline"
                      href={`/api/invoices/${encodeURIComponent(row.id)}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      PDF
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right align-top">
                    <Button
                      type="button"
                      variant="create"
                      className="h-9 px-3 text-xs"
                      disabled={paymentMethods.length === 0}
                      onClick={() => setPayInvoiceId(row.id)}
                    >
                      Pay
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TablePaginationBar page={page} pageSize={pageSize} total={total} onPageChange={goToPage} />

      <ModalShell
        open={payRow !== null}
        onClose={() => setPayInvoiceId(null)}
        titleId="record-outstanding-payment-title"
        title="Record payment"
        subtitle={
          payRow
            ? `${invoiceTypeLabel(payRow.invoiceType)} invoice — balance ${payRow.balanceDue}`
            : ""
        }
        maxWidthClass="max-w-lg"
      >
        {payRow ? (
          <form className="grid gap-4" onSubmit={submitPayment}>
            <Input
              label="Amount"
              name="amountPaid"
              type="number"
              min={0}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium text-[var(--text-primary)]">Payment method</span>
              <select
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/25"
                value={paymentMethodId}
                onChange={(e) => setPaymentMethodId(e.target.value)}
                required
              >
                <option value="">Select</option>
                {paymentMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.lookupValue}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Reference (optional)"
              name="transactionRef"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
            />
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" disabled={submitting} onClick={() => setPayInvoiceId(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="create" isLoading={submitting}>
                Record payment
              </Button>
            </div>
          </form>
        ) : null}
      </ModalShell>
    </div>
  );
}

