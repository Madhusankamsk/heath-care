import { Prisma } from "@prisma/client";

import prisma from "../prisma/client";

async function requireLookupId(
  tx: Prisma.TransactionClient,
  categoryName: string,
  lookupKey: string,
): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey,
      isActive: true,
      category: { categoryName },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error(`Missing lookup ${categoryName}/${lookupKey}`);
  }
  return row.id;
}

async function validatePaymentMethod(tx: Prisma.TransactionClient, paymentMethodId: string): Promise<void> {
  const row = await tx.lookup.findFirst({
    where: {
      id: paymentMethodId,
      isActive: true,
      category: { categoryName: "PAYMENT_METHOD" },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error("Invalid paymentMethodId");
  }
}

export type OutstandingVisitInvoiceRow = {
  id: string;
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  bookingId: string;
  bookingScheduledDate: string | null;
  patientId: string | null;
  patientName: string | null;
};

export async function listOutstandingVisitInvoices(): Promise<OutstandingVisitInvoiceRow[]> {
  const rows = await prisma.invoice.findMany({
    where: {
      bookingId: { not: null },
      subscriptionAccountId: null,
      balanceDue: { gt: 0 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      balanceDue: true,
      totalAmount: true,
      paidAmount: true,
      bookingId: true,
      patientId: true,
      patient: { select: { fullName: true } },
      booking: { select: { id: true, scheduledDate: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    balanceDue: r.balanceDue.toString(),
    totalAmount: r.totalAmount.toString(),
    paidAmount: r.paidAmount.toString(),
    bookingId: r.bookingId!,
    bookingScheduledDate: r.booking?.scheduledDate?.toISOString() ?? null,
    patientId: r.patientId,
    patientName: r.patient?.fullName ?? null,
  }));
}

export async function recordVisitInvoicePayment(params: {
  invoiceId: string;
  amountPaid: string | number;
  paymentMethodId: string;
  transactionRef?: string | null;
  collectedByUserId: string;
}): Promise<{ invoiceId: string; balanceDue: string }> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: params.invoiceId },
      select: {
        id: true,
        bookingId: true,
        subscriptionAccountId: true,
        paidAmount: true,
        balanceDue: true,
      },
    });

    if (!invoice?.bookingId) {
      throw new Error("Invoice is not a visit invoice");
    }
    if (invoice.subscriptionAccountId) {
      throw new Error("Invoice is not a visit invoice");
    }

    const balanceDue = new Prisma.Decimal(invoice.balanceDue);
    if (balanceDue.lte(0)) {
      throw new Error("Invoice has no balance due");
    }

    const amt = new Prisma.Decimal(params.amountPaid);
    if (amt.lte(0)) {
      throw new Error("Amount must be positive");
    }
    if (amt.gt(balanceDue)) {
      throw new Error("Amount exceeds balance due");
    }

    await validatePaymentMethod(tx, params.paymentMethodId.trim());
    const collector = params.collectedByUserId?.trim();
    if (!collector) {
      throw new Error("collectedByUserId is required when recording payments");
    }

    const paymentPurposeId = await requireLookupId(tx, "PAYMENT_PURPOSE", "OTHER");

    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountPaid: amt,
        paymentMethodId: params.paymentMethodId.trim(),
        paymentPurposeId,
        transactionRef: params.transactionRef?.trim() ? params.transactionRef.trim() : null,
        collectedById: collector,
      },
    });

    const newPaid = new Prisma.Decimal(invoice.paidAmount).add(amt);
    const newBalance = balanceDue.sub(amt);

    let paymentStatusKey: "PARTIAL" | "PAID";
    let paymentStatusLabel: string;
    if (newBalance.eq(0)) {
      paymentStatusKey = "PAID";
      paymentStatusLabel = "Paid";
    } else {
      paymentStatusKey = "PARTIAL";
      paymentStatusLabel = "Partial";
    }

    const paymentStatusId = await requireLookupId(tx, "INVOICE_PAYMENT_STATUS", paymentStatusKey);

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        balanceDue: newBalance,
        paymentStatus: paymentStatusLabel,
        paymentStatusId,
      },
    });

    return { invoiceId: invoice.id, balanceDue: newBalance.toString() };
  });
}
