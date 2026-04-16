import { sendEmail, type SendEmailResult } from "./sendEmail";

export async function sendPasswordResetEmail(params: {
  to: string;
  resetUrl: string;
}): Promise<SendEmailResult> {
  const { to, resetUrl } = params;
  const subject = "Reset your password";
  const text = [
    "You requested a password reset for your Health account.",
    "",
    `Open this link to choose a new password (valid for 1 hour):`,
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
    <p>You requested a password reset for your Health account.</p>
    <p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p>
    <p style="color:#666;font-size:12px;">If you did not request this, you can ignore this email.</p>
  `.trim();

  const result = await sendEmail({ to, subject, text, html });

  if (!result.ok) {
    console.error("[password-reset] sendEmail failed:", result.error);
  }

  return result;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
