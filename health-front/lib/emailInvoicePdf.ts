import { toast } from "@/lib/toast";

export type EmailInvoicePdfResponse = {
  sent?: boolean;
  skipped?: boolean;
  reason?: string;
  message?: string;
  messageId?: string;
};

function safeParseJson(raw: string): EmailInvoicePdfResponse {
  try {
    return raw ? (JSON.parse(raw) as EmailInvoicePdfResponse) : {};
  } catch {
    return {};
  }
}

/**
 * Emails the invoice PDF to the resolved recipient (subscription contact email, or patient / guardian for visits).
 * Toasts distinguish missing recipient (400), SMTP failure (502), skipped send (config), and other errors.
 */
export async function emailInvoicePdf(invoiceId: string): Promise<EmailInvoicePdfResponse | null> {
  const loadingId = toast.loading("Please wait — sending invoice email...");

  let res: Response;
  let raw = "";
  try {
    res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    raw = await res.text().catch(() => "");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    toast.dismiss(loadingId);
    toast.error("Email delivery failed", { description: msg });
    return null;
  }

  const data = safeParseJson(raw);
  const apiMessage = data.message?.trim();
  const fallbackRaw = typeof raw === "string" && raw.length > 0 && raw.length < 600 ? raw.trim() : "";

  if (!res.ok) {
    if (res.status === 400) {
      const msg =
        apiMessage ||
        "No email address on file for this invoice. Add a contact email on the account or patient/guardian email.";
      toast.dismiss(loadingId);
      toast.error("Cannot send invoice email", { description: msg });
      return { ...data, message: msg };
    }

    if (res.status === 502) {
      const detail =
        apiMessage ||
        fallbackRaw ||
        "The mail server rejected the message or could not be reached. Check SMTP settings and server logs.";
      toast.dismiss(loadingId);
      toast.error("Email delivery failed", { description: detail });
      return { ...data, message: detail };
    }

    if (res.status >= 500) {
      const msg = apiMessage || fallbackRaw || "Server error while sending email.";
      toast.dismiss(loadingId);
      toast.error("Could not send invoice email", { description: msg });
      return { ...data, message: msg };
    }

    const msg =
      apiMessage ||
      fallbackRaw ||
      (res.status === 0
        ? "Network error — check your connection."
        : "Failed to send invoice email.");
    toast.dismiss(loadingId);
    toast.error("Could not send invoice email", { description: msg });
    return { ...data, message: msg };
  }

  if (data.skipped) {
    const title = data.message ?? "Email was not sent.";
    const description = data.reason
      ? humanizeSkippedReason(data.reason)
      : "Turn on EMAIL_ENABLED and set EMAIL_FROM, SMTP_HOST, and credentials on the API server.";
    toast.dismiss(loadingId);
    toast.warning(title, { description });
    return data;
  }

  toast.dismiss(loadingId);
  toast.success("Invoice emailed");
  return data;
}

/** Maps backend skip reasons to short hints for operators. */
function humanizeSkippedReason(reason: string): string {
  const r = reason.trim();
  if (r.includes("EMAIL_ENABLED")) {
    return "Set EMAIL_ENABLED=true in the API environment and restart the server.";
  }
  if (r.includes("EMAIL_FROM") || r.includes("SMTP_FROM") || r.includes("From address")) {
    return "Set a sender (EMAIL_FROM or SMTP_FROM), SMTP_HOST, and usually SMTP_USER/SMTP_PASS in the API .env, then restart the server.";
  }
  if (r.includes("EMAIL_LOG_ONLY")) {
    return "EMAIL_LOG_ONLY is on — emails are logged only, not sent.";
  }
  if (r.includes("empty recipient")) {
    return "No recipient address was resolved for this invoice.";
  }
  return r;
}
