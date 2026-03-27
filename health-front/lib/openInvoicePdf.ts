/**
 * Opens the subscription invoice PDF in a new tab (same-origin proxy includes auth cookies).
 */
export function openInvoicePdf(invoiceId: string) {
  window.open(
    `/api/invoices/${encodeURIComponent(invoiceId)}/pdf`,
    "_blank",
    "noopener,noreferrer",
  );
}
