import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

/** Placeholder in-house nursing totals; travel is zero. */
export const DUMMY_IN_HOUSE_INVOICE_AMOUNTS = {
  consultationTotal: new Prisma.Decimal("1500"),
  medicineTotal: new Prisma.Decimal("500"),
  travelCost: new Prisma.Decimal("0"),
  totalAmount: new Prisma.Decimal("2400"),
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

async function requireInvoiceTypeInHouseId(tx: Tx): Promise<string> {
  const row = await tx.lookup.findFirst({
    where: {
      lookupKey: "IN_HOUSE",
      isActive: true,
      category: { categoryName: "INVOICE_TYPE" },
    },
    select: { id: true },
  });
  if (!row) {
    throw new Error("Missing INVOICE_TYPE/IN_HOUSE lookup");
  }
  return row.id;
}

/**
 * Creates a single unpaid in-house invoice when none exists for the booking.
 * Uses VisitInvoice bridge row (booking-linked non-OPD billing).
 */
export async function createInHouseInvoiceIfAbsent(
  tx: Tx,
  params: { bookingId: string; patientId: string; createdByUserId?: string | null },
): Promise<{ invoiceId: string; created: boolean }> {
  const existing = await tx.visitInvoice.findUnique({
    where: { bookingId: params.bookingId },
    select: { invoiceId: true },
  });
  if (existing) {
    return { invoiceId: existing.invoiceId, created: false };
  }

  const paymentStatusId = await requireInvoicePaymentStatusUnpaidId(tx);
  const invoiceTypeId = await requireInvoiceTypeInHouseId(tx);
  const { consultationTotal, medicineTotal, travelCost, totalAmount } = DUMMY_IN_HOUSE_INVOICE_AMOUNTS;
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

  await tx.visitInvoice.create({
    data: {
      invoiceId: inv.id,
      bookingId: params.bookingId,
      patientId: params.patientId,
    },
  });

  return { invoiceId: inv.id, created: true };
}
