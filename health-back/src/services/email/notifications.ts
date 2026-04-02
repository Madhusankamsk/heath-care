import prisma from "../../prisma/client";
import { sendEmail } from "./sendEmail";

const LOG_PREFIX = "[email:notifications]";

function logSendError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`${LOG_PREFIX} ${context}: ${message}`);
}

/**
 * New subscription account (dashboard flow). Resolution order: explicit `recipientEmail`,
 * then `subscriptionAccount.contactEmail`, then primary contact `patient.email`,
 * then guardian email when `hasGuardian`.
 */
export async function notifySubscriptionAccountCreated(params: {
  subscriptionAccountId: string;
  invoiceId: string;
  recipientEmail?: string | null;
}): Promise<void> {
  try {
    const to = params.recipientEmail?.trim() || null;

    const row = await prisma.subscriptionAccount.findUnique({
      where: { id: params.subscriptionAccountId },
      select: {
        accountName: true,
        contactEmail: true,
        primaryContactId: true,
        plan: { select: { planName: true } },
      },
    });

    const primary =
      row?.primaryContactId != null
        ? await prisma.patient.findUnique({
            where: { id: row.primaryContactId },
            select: { email: true, guardianEmail: true, hasGuardian: true },
          })
        : null;

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.invoiceId },
      select: { totalAmount: true, balanceDue: true, paidAmount: true },
    });

    const guardianTo =
      primary?.hasGuardian && primary.guardianEmail?.trim()
        ? primary.guardianEmail.trim()
        : null;

    const resolvedTo =
      to ||
      row?.contactEmail?.trim() ||
      primary?.email?.trim() ||
      guardianTo ||
      null;
    if (!resolvedTo) {
      return;
    }

    const accountLabel = row?.accountName?.trim() || "Subscription account";
    const planName = row?.plan?.planName ?? "—";
    const total = invoice?.totalAmount?.toString() ?? "—";
    const paid = invoice?.paidAmount?.toString() ?? "0";
    const balance = invoice?.balanceDue?.toString() ?? "—";

    const text = [
      `Your subscription account has been created.`,
      ``,
      `Account: ${accountLabel}`,
      `Plan: ${planName}`,
      `Invoice total: ${total}`,
      `Amount paid: ${paid}`,
      `Balance due: ${balance}`,
      ``,
      `Thank you.`,
    ].join("\n");

    const result = await sendEmail({
      to: resolvedTo,
      subject: `Subscription created — ${planName}`,
      text,
    });

    if (!result.ok) {
      logSendError("notifySubscriptionAccountCreated", result.error);
    }
  } catch (err) {
    logSendError("notifySubscriptionAccountCreated", err);
  }
}

export async function notifySubscriptionPaymentRecorded(invoiceId: string): Promise<void> {
  try {
    const data = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        balanceDue: true,
        paidAmount: true,
        totalAmount: true,
        subscriptionAccount: {
          select: {
            contactEmail: true,
            accountName: true,
            plan: { select: { planName: true } },
            primaryContact: {
              select: { email: true, guardianEmail: true, hasGuardian: true },
            },
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 1,
          select: { amountPaid: true },
        },
      },
    });

    if (!data) {
      return;
    }

    const acc = data.subscriptionAccount;
    const pc = acc?.primaryContact;
    const toGuardian =
      pc?.hasGuardian && pc.guardianEmail?.trim() ? pc.guardianEmail.trim() : null;
    const email =
      acc?.contactEmail?.trim() || pc?.email?.trim() || toGuardian || null;
    if (!email) {
      return;
    }

    const lastAmount = data.payments[0]?.amountPaid?.toString() ?? "—";
    const accountLabel = data.subscriptionAccount?.accountName?.trim() || "Subscription account";
    const planName = data.subscriptionAccount?.plan?.planName ?? "—";
    const balance = data.balanceDue?.toString() ?? "—";
    const total = data.totalAmount?.toString() ?? "—";
    const paidTotal = data.paidAmount?.toString() ?? "—";

    const text = [
      `We recorded a payment on your subscription invoice.`,
      ``,
      `Account: ${accountLabel}`,
      `Plan: ${planName}`,
      `Invoice total: ${total}`,
      `Total paid (after this payment): ${paidTotal}`,
      `This payment amount: ${lastAmount}`,
      `Remaining balance due: ${balance}`,
      ``,
      `Thank you.`,
    ].join("\n");

    const result = await sendEmail({
      to: email,
      subject: `Payment received — ${planName}`,
      text,
    });

    if (!result.ok) {
      logSendError("notifySubscriptionPaymentRecorded", result.error);
    }
  } catch (err) {
    logSendError("notifySubscriptionPaymentRecorded", err);
  }
}

export async function notifyVisitPaymentRecorded(invoiceId: string): Promise<void> {
  try {
    const data = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        balanceDue: true,
        paidAmount: true,
        totalAmount: true,
        patient: {
          select: {
            fullName: true,
            email: true,
            guardianEmail: true,
            hasGuardian: true,
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 1,
          select: { amountPaid: true },
        },
      },
    });

    if (!data) {
      return;
    }

    const patient = data.patient;
    const toPatient = patient?.email?.trim() || null;
    const toGuardian =
      patient?.hasGuardian && patient.guardianEmail?.trim() ? patient.guardianEmail.trim() : null;
    const to = toPatient || toGuardian;
    if (!to) {
      return;
    }

    const lastAmount = data.payments[0]?.amountPaid?.toString() ?? "—";
    const name = patient?.fullName ?? "Patient";
    const balance = data.balanceDue?.toString() ?? "—";
    const total = data.totalAmount?.toString() ?? "—";
    const paidTotal = data.paidAmount?.toString() ?? "—";

    const text = [
      `We recorded a payment on a visit invoice.`,
      ``,
      `Patient: ${name}`,
      `Invoice total: ${total}`,
      `Total paid (after this payment): ${paidTotal}`,
      `This payment amount: ${lastAmount}`,
      `Remaining balance due: ${balance}`,
      ``,
      `Thank you.`,
    ].join("\n");

    const result = await sendEmail({
      to,
      subject: `Visit payment recorded — ${name}`,
      text,
    });

    if (!result.ok) {
      logSendError("notifyVisitPaymentRecorded", result.error);
    }
  } catch (err) {
    logSendError("notifyVisitPaymentRecorded", err);
  }
}
