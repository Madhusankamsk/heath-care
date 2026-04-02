import nodemailer from "nodemailer";

export type SendEmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: SendEmailAttachment[];
};

export type SendEmailResult =
  | { ok: true; messageId?: string; skipped?: false }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; error: string };

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return defaultValue;
  return v === "1" || v.toLowerCase() === "true" || v.toLowerCase() === "yes";
}

/** Sender address: `EMAIL_FROM` preferred, else `SMTP_FROM` (common alias in .env files). */
function resolveMailFrom(): string | undefined {
  const a = process.env.EMAIL_FROM?.trim();
  const b = process.env.SMTP_FROM?.trim();
  return a || b || undefined;
}

function isEmailConfigured(): boolean {
  if (!envBool("EMAIL_ENABLED", false)) {
    return false;
  }
  const from = resolveMailFrom();
  const host = process.env.SMTP_HOST?.trim();
  if (!from || !host) {
    return false;
  }
  return true;
}

/**
 * Low-level send. When email is disabled or SMTP is incomplete, returns `{ skipped: true }` without throwing.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const logOnly = envBool("EMAIL_LOG_ONLY", false);

  if (!envBool("EMAIL_ENABLED", false)) {
    return { ok: true, skipped: true, reason: "EMAIL_ENABLED is not true" };
  }

  const from = resolveMailFrom();
  const host = process.env.SMTP_HOST?.trim();
  const port = Number.parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = envBool("SMTP_SECURE", false);
  const user = process.env.SMTP_USER?.trim() ?? "";
  const pass = process.env.SMTP_PASS ?? "";

  if (!from || !host) {
    return {
      ok: true,
      skipped: true,
      reason: "From address (EMAIL_FROM or SMTP_FROM) or SMTP_HOST missing",
    };
  }

  const to = input.to.trim();
  if (!to) {
    return { ok: true, skipped: true, reason: "empty recipient" };
  }

  if (logOnly) {
    console.info("[email] EMAIL_LOG_ONLY — would send:", {
      from,
      to,
      subject: input.subject,
      textPreview: input.text.slice(0, 200),
      attachmentNames: input.attachments?.map((a) => a.filename),
      attachmentSizes: input.attachments?.map((a) => a.content.length),
    });
    return { ok: true, skipped: true, reason: "EMAIL_LOG_ONLY" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port: Number.isFinite(port) ? port : 587,
      secure,
      auth: user ? { user, pass } : undefined,
    });

    const attachments = input.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType ?? "application/octet-stream",
    }));

    const info = await transporter.sendMail({
      from,
      to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      ...(attachments && attachments.length > 0 ? { attachments } : {}),
    });

    return { ok: true, messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

export function isEmailSendingConfigured(): boolean {
  return isEmailConfigured();
}
