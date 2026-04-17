import { Prisma } from "@prisma/client";

import prisma from "../prisma/client";

import { notifyVisitPaymentRecorded } from "./email/notifications";

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

export async function listOutstandingVisitInvoices(params: {
  skip: number;
  take: number;
}): Promise<{ items: OutstandingVisitInvoiceRow[]; total: number }> {
  const where = {
    invoiceTypeLookup: { is: { lookupKey: "VISIT" } },
    visitInvoice: { isNot: null },
    balanceDue: { gt: 0 },
  };

  const [total, rows] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      select: {
      id: true,
      createdAt: true,
      balanceDue: true,
      totalAmount: true,
      paidAmount: true,
      visitInvoice: {
        select: {
          bookingId: true,
          patientId: true,
          patient: { select: { fullName: true } },
          booking: { select: { id: true, scheduledDate: true } },
        },
      },
    },
  }),
  ]);

  const items = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    balanceDue: r.balanceDue.toString(),
    totalAmount: r.totalAmount.toString(),
    paidAmount: r.paidAmount.toString(),
    bookingId: r.visitInvoice?.bookingId ?? "",
    bookingScheduledDate: r.visitInvoice?.booking?.scheduledDate?.toISOString() ?? null,
    patientId: r.visitInvoice?.patientId ?? null,
    patientName: r.visitInvoice?.patient?.fullName ?? null,
  }));

  return { items, total };
}

export async function recordVisitInvoicePayment(params: {
  invoiceId: string;
  amountPaid: string | number;
  paymentMethodId: string;
  transactionRef?: string | null;
  paySlipUrl?: string | null;
  collectedByUserId: string;
}): Promise<{ invoiceId: string; balanceDue: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: params.invoiceId },
      select: {
        id: true,
        invoiceTypeLookup: { select: { lookupKey: true } },
        paidAmount: true,
        balanceDue: true,
        visitInvoice: { select: { bookingId: true } },
      },
    });

    if (
      !invoice ||
      invoice.invoiceTypeLookup.lookupKey !== "VISIT" ||
      !invoice.visitInvoice?.bookingId
    ) {
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

    const slip = params.paySlipUrl?.trim();
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountPaid: amt,
        paymentMethodId: params.paymentMethodId.trim(),
        paymentPurposeId,
        transactionRef: params.transactionRef?.trim() ? params.transactionRef.trim() : null,
        paySlipUrl: slip ? slip : null,
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

  void notifyVisitPaymentRecorded(result.invoiceId);

  return result;
}
