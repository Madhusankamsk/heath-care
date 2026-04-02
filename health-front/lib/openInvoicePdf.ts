/**
 * Opens the subscription invoice PDF in a new tab (same-origin proxy includes auth cookies).
 */
import { toast } from "@/lib/toast";

export async function openInvoicePdf(invoiceId: string): Promise<void> {
  const loadingId = (await (async () => {
    try {
      // Sonner supports `toast.loading`. If unavailable in this project setup,
      // this will throw and we silently fall back to opening.
      return toast.loading("Please wait — preparing invoice PDF...");
    } catch {
      return null;
    }
  })());

  try {
    const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/pdf`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "application/pdf";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    window.open(url, "_blank", "noopener,noreferrer");

    if (loadingId) toast.dismiss(loadingId);
    toast.success("PDF opened");

    // Release memory after the browser has had time to load the blob.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    if (loadingId) toast.dismiss(loadingId);
    const msg = e instanceof Error ? e.message : "Failed to open PDF";
    toast.error("Could not open invoice PDF", { description: msg });
  }
}
