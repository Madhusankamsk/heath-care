import { Prisma } from "@prisma/client";

export type SubscriptionPaymentInput = {
  amountPaid: string | number;
  paymentMethodId: string;
  transactionRef?: string | null;
};

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

async function validatePaymentMethod(
  tx: Prisma.TransactionClient,
  paymentMethodId: string,
): Promise<void> {
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

/**
 * Creates subscription invoice, ledger entries (DEBIT charge + CREDIT payments), and updates
 * subscription account outstanding balance by the unpaid remainder (balance due).
 */
export async function createSubscriptionInvoiceWithLedger(
  tx: Prisma.TransactionClient,
  params: {
    subscriptionAccountId: string;
    patientId: string;
    planId: string;
    payments: SubscriptionPaymentInput[];
    collectedByUserId: string;
  },
): Promise<{ invoiceId: string }> {
  const plan = await tx.subscriptionPlan.findUnique({
    where: { id: params.planId },
    select: {
      id: true,
      planName: true,
      price: true,
    },
  });
  if (!plan) {
    throw new Error("Subscription plan not found");
  }

  const total = new Prisma.Decimal(plan.price);
  let paidSum = new Prisma.Decimal(0);

  for (const p of params.payments) {
    const amt = new Prisma.Decimal(p.amountPaid);
    if (amt.lte(0)) {
      throw new Error("Each payment amount must be positive");
    }
    await validatePaymentMethod(tx, p.paymentMethodId.trim());
    paidSum = paidSum.add(amt);
  }

  if (paidSum.gt(total)) {
    throw new Error("Total payments exceed invoice amount");
  }

  if (params.payments.length > 0 && !params.collectedByUserId?.trim()) {
    throw new Error("collectedByUserId is required when recording payments");
  }

  const balanceDue = total.sub(paidSum);

  let paymentStatusKey: "UNPAID" | "PARTIAL" | "PAID";
  let paymentStatusLabel: string;
  if (paidSum.eq(0)) {
    paymentStatusKey = "UNPAID";
    paymentStatusLabel = "Unpaid";
  } else if (balanceDue.eq(0)) {
    paymentStatusKey = "PAID";
    paymentStatusLabel = "Paid";
  } else {
    paymentStatusKey = "PARTIAL";
    paymentStatusLabel = "Partial";
  }

  const paymentStatusId = await requireLookupId(
    tx,
    "INVOICE_PAYMENT_STATUS",
    paymentStatusKey,
  );

  const debitTypeId = await requireLookupId(tx, "ACCOUNT_TRANSACTION_TYPE", "DEBIT");
  const creditTypeId = await requireLookupId(tx, "ACCOUNT_TRANSACTION_TYPE", "CREDIT");

  const invoice = await tx.invoice.create({
    data: {
      patientId: params.patientId,
      subscriptionAccountId: params.subscriptionAccountId,
      bookingId: null,
      totalAmount: total,
      consultationTotal: total,
      medicineTotal: new Prisma.Decimal(0),
      travelCost: new Prisma.Decimal(0),
      paidAmount: paidSum,
      balanceDue,
      paymentStatus: paymentStatusLabel,
      paymentStatusId,
    },
  });

  await tx.accountTransaction.create({
    data: {
      subscriptionAccountId: params.subscriptionAccountId,
      transactionTypeId: debitTypeId,
      amount: total,
      description: `Subscription: ${plan.planName}`,
    },
  });

  for (const p of params.payments) {
    const amt = new Prisma.Decimal(p.amountPaid);
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountPaid: amt,
        paymentMethodId: p.paymentMethodId.trim(),
        transactionRef: p.transactionRef?.trim() ? p.transactionRef.trim() : null,
        collectedById: params.collectedByUserId.trim(),
      },
    });
    await tx.accountTransaction.create({
      data: {
        subscriptionAccountId: params.subscriptionAccountId,
        transactionTypeId: creditTypeId,
        amount: amt,
        description: "Subscription payment",
      },
    });
  }

  await tx.subscriptionAccount.update({
    where: { id: params.subscriptionAccountId },
    data: {
      outstandingBalance: { increment: balanceDue },
    },
  });

  return { invoiceId: invoice.id };
}
