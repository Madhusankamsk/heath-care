import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/**
 * Placeholder breakdown for home-visit invoices. Replace with real pricing when ready.
 * Totals align with the patient bill preview (consultation + lab + meds + GST).
 */
export const DUMMY_VISIT_INVOICE_AMOUNTS = {
  consultationTotal: new Prisma.Decimal("1200"),
  medicineTotal: new Prisma.Decimal("420"),
  travelCost: new Prisma.Decimal("850"),
  totalAmount: new Prisma.Decimal("2914.6"),
} as const;

async function requireInvoicePaymentStatusUnpaidId(tx: Tx): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey: "UNPAID",
      isActive: true,
      category: { categoryName: "INVOICE_PAYMENT_STATUS" },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error("Missing INVOICE_PAYMENT_STATUS/UNPAID lookup");
  }
  return row.id;
}

async function requireInvoiceTypeVisitId(tx: Tx): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey: "VISIT",
      isActive: true,
      category: { categoryName: "INVOICE_TYPE" },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error("Missing INVOICE_TYPE/VISIT lookup");
  }
  return row.id;
}

/**
 * Creates a single unpaid invoice for a completed visit when none exists for the booking.
 * Idempotent per booking (safe if invoked again for the same booking in edge cases).
 */
export async function createVisitInvoiceIfAbsent(
  tx: Tx,
  params: { bookingId: string; patientId: string },
): Promise<{ invoiceId: string; created: boolean }> {
  const existing = await tx.visitInvoice.findUnique({
    where: { bookingId: params.bookingId },
    select: { invoiceId: true },
  });
  if (existing) {
    return { invoiceId: existing.invoiceId, created: false };
  }

  const paymentStatusId = await requireInvoicePaymentStatusUnpaidId(tx);
  const invoiceTypeId = await requireInvoiceTypeVisitId(tx);
  const { consultationTotal, medicineTotal, travelCost, totalAmount } = DUMMY_VISIT_INVOICE_AMOUNTS;
  const balanceDue = totalAmount;

  const inv = await tx.invoice.create({
    data: {
      invoiceTypeId,
      bookingId: params.bookingId,
      patientId: params.patientId,
      subscriptionAccountId: null,
      totalAmount,
      consultationTotal,
      medicineTotal,
      travelCost,
      paidAmount: new Prisma.Decimal(0),
      balanceDue,
      paymentStatus: "Unpaid",
      paymentStatusId,
    },
  });

  await tx.visitInvoice.create({
    data: {
      invoiceId: inv.id,
      bookingId: params.bookingId,
      patientId: params.patientId,
    },
  });

  return { invoiceId: inv.id, created: true };
}
