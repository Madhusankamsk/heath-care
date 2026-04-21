import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Placeholder OPD walk-in totals; travel is zero. */
export const DUMMY_OPD_INVOICE_AMOUNTS = {
  consultationTotal: new Prisma.Decimal("1200"),
  medicineTotal: new Prisma.Decimal("420"),
  travelCost: new Prisma.Decimal("0"),
  totalAmount: new Prisma.Decimal("2206.2"),
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

async function requireInvoiceTypeOpdId(tx: Tx): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey: "OPD",
      isActive: true,
      category: { categoryName: "INVOICE_TYPE" },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error("Missing INVOICE_TYPE/OPD lookup");
  }
  return row.id;
}

/**
 * Creates a single unpaid OPD invoice when none exists for the queue/booking pair.
 * Idempotent per booking.
 */
export async function createOpdInvoiceIfAbsent(
  tx: Tx,
  params: { opdQueueId: string; bookingId: string; patientId: string; createdByUserId?: string | null },
): Promise<{ invoiceId: string; created: boolean }> {
  const existing = await tx.opdInvoice.findUnique({
    where: { bookingId: params.bookingId },
    select: { invoiceId: true },
  });
  if (existing) {
    return { invoiceId: existing.invoiceId, created: false };
  }

  const paymentStatusId = await requireInvoicePaymentStatusUnpaidId(tx);
  const invoiceTypeId = await requireInvoiceTypeOpdId(tx);
  const { consultationTotal, medicineTotal, travelCost, totalAmount } = DUMMY_OPD_INVOICE_AMOUNTS;
  const balanceDue = totalAmount;

  const inv = await tx.invoice.create({
    data: {
      invoiceTypeId,
      createdById: params.createdByUserId?.trim() || null,
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

  await tx.opdInvoice.create({
    data: {
      invoiceId: inv.id,
      opdQueueId: params.opdQueueId,
      bookingId: params.bookingId,
      patientId: params.patientId,
    },
  });

  return { invoiceId: inv.id, created: true };
}
