import type { Request, Response } from "express";

import prisma from "../prisma/client";
import { sendEmail } from "../services/email/sendEmail";
import { buildSubscriptionInvoicePdfBuffer, buildVisitInvoicePdfBuffer } from "../services/invoicePdfService";

export async function getInvoicePdfHandler(req: Request, res: Response) {
  const { id } = req.params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: {
        select: { fullName: true, nicOrPassport: true, contactNo: true },
      },
      subscriptionAccount: {
        select: {
          accountName: true,
          registrationNo: true,
          billingAddress: true,
          contactEmail: true,
          contactPhone: true,
          whatsappNo: true,
          plan: { select: { planName: true } },
        },
      },
      booking: {
        select: { scheduledDate: true },
      },
      paymentStatusLookup: { select: { lookupValue: true } },
    },
  });

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  const company = await prisma.companySettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  try {
    if (invoice.subscriptionAccountId) {
      const pdf = await buildSubscriptionInvoicePdfBuffer(company, invoice);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoice.id}.pdf"`);
      return res.status(200).send(pdf);
    }

    if (invoice.bookingId) {
      const pdf = await buildVisitInvoicePdfBuffer(company, invoice);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="visit-invoice-${invoice.id}.pdf"`);
      return res.status(200).send(pdf);
    }

    return res.status(400).json({ message: "PDF is not available for this invoice type" });
  } catch {
    return res.status(500).json({ message: "Unable to generate PDF" });
  }
}

export async function postSendInvoiceEmailHandler(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as { to?: string } | undefined;
  const overrideTo =
    typeof body?.to === "string" ? body.to.trim() || null : null;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: {
        select: {
          fullName: true,
          nicOrPassport: true,
          contactNo: true,
          email: true,
          hasGuardian: true,
          guardianEmail: true,
        },
      },
      subscriptionAccount: {
        select: {
          accountName: true,
          registrationNo: true,
          billingAddress: true,
          contactEmail: true,
          contactPhone: true,
          whatsappNo: true,
          plan: { select: { planName: true } },
        },
      },
      booking: {
        select: { scheduledDate: true },
      },
      paymentStatusLookup: { select: { lookupValue: true } },
    },
  });

  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }

  let to = overrideTo;
  if (!to) {
    if (invoice.subscriptionAccountId && invoice.subscriptionAccount) {
      to = invoice.subscriptionAccount.contactEmail?.trim() || null;
    } else if (invoice.bookingId && invoice.patient) {
      const p = invoice.patient;
      to = p.email?.trim() || null;
      if (!to && p.hasGuardian && p.guardianEmail?.trim()) {
        to = p.guardianEmail.trim();
      }
    }
  }

  if (!to) {
    return res.status(400).json({
      message:
        "No invoice email on file. Add a contact email on the subscription account, or patient email / guardian email for visit invoices.",
    });
  }

  const company = await prisma.companySettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  let pdf: Buffer;
  let filename: string;
  let subject: string;

  try {
    if (invoice.subscriptionAccountId) {
      pdf = await buildSubscriptionInvoicePdfBuffer(company, invoice);
      filename = `invoice-${invoice.id}.pdf`;
      subject = `Invoice — ${invoice.subscriptionAccount?.plan?.planName ?? "Subscription"}`;
    } else if (invoice.bookingId) {
      pdf = await buildVisitInvoicePdfBuffer(company, invoice);
      filename = `visit-invoice-${invoice.id}.pdf`;
      subject = `Visit invoice — ${invoice.patient?.fullName ?? "Patient"}`;
    } else {
      return res.status(400).json({ message: "PDF is not available for this invoice type" });
    }
  } catch {
    return res.status(500).json({ message: "Unable to generate PDF" });
  }

  const text = [`Please find your invoice attached.`, ``, `Invoice ID: ${invoice.id}`, ``, `Thank you.`].join(
    "\n",
  );

  const patientName = invoice.patient?.fullName?.trim() || "Customer";
  const planName = invoice.subscriptionAccount?.plan?.planName?.trim();
  const invoiceTypeLabel = invoice.subscriptionAccountId ? (planName ? `Subscription (${planName})` : "Subscription") : "Visit";

  const totalAmount = invoice.totalAmount?.toString?.() ?? "—";
  const balanceDue = invoice.balanceDue?.toString?.() ?? "—";
  const statusLabel = invoice.paymentStatusLookup?.lookupValue ?? invoice.paymentStatus ?? "—";

  const html = `
  <div style="margin:0;padding:0;background:#f3faf9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;font-weight:700;">
          ${invoiceTypeLabel}
        </div>
        <h2 style="margin:8px 0 0 0;font-size:22px;line-height:1.2;color:#0f172a;">
          Invoice for ${patientName}
        </h2>

        <p style="margin:14px 0 0 0;font-size:14px;line-height:1.6;color:#334155;">
          Please find your invoice attached.
        </p>

        <div style="margin-top:16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
            <tbody>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#64748b;">Invoice ID</td>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#0f172a;text-align:right;">${invoice.id}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#64748b;">Total</td>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#0f172a;text-align:right;">${totalAmount}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#64748b;">Balance due</td>
                <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:13px;color:#0f172a;text-align:right;">${balanceDue}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#64748b;">Status</td>
                <td style="padding:10px 0;font-size:13px;color:#0f172a;text-align:right;">${statusLabel}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#334155;">
          If you have any questions, please contact us.
        </p>

        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:12px;color:#64748b;">
          ${company?.companyName ? `<div style="font-weight:700;color:#0f172a;">${company.companyName}</div>` : ""}
          ${
            company?.companyEmail
              ? `Email: ${company.companyEmail}`
              : "Email: support@healthscan.com"
          }
        </div>
      </div>
      <div style="height:8px;"></div>
      <div style="text-align:center;font-size:11px;color:#94a3b8;">
        This email was generated automatically. Please do not reply to this message.
      </div>
    </div>
  </div>
  `;

  const result = await sendEmail({
    to,
    subject,
    text,
    html,
    attachments: [{ filename, content: pdf, contentType: "application/pdf" }],
  });

  if (result.ok && "skipped" in result && result.skipped) {
    return res.status(200).json({
      sent: false,
      skipped: true,
      reason: result.reason,
      message: "Email is disabled or not configured; invoice was not sent.",
    });
  }

  if (!result.ok) {
    return res.status(502).json({
      sent: false,
      message: "error" in result ? result.error : "Failed to send email",
    });
  }

  return res.status(200).json({ sent: true, messageId: result.messageId });
}
