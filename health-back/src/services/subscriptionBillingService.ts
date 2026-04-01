import { Prisma } from "@prisma/client";

import prisma from "../prisma/client";

import { notifySubscriptionPaymentRecorded } from "./email/notifications";

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

/** Maps subscription plan type (SUB_TYPE) to PAYMENT_PURPOSE lookup key. */
function planTypeLookupKeyToPaymentPurposeKey(
  planTypeLookupKey: string | null | undefined,
): "INDIVIDUAL_MEMBERSHIP" | "FAMILY_PACKAGE_PAYMENT" | "CORPORATE_SUBSCRIPTION" | "OTHER" {
  if (planTypeLookupKey === "INDIVIDUAL") return "INDIVIDUAL_MEMBERSHIP";
  if (planTypeLookupKey === "FAMILY") return "FAMILY_PACKAGE_PAYMENT";
  if (planTypeLookupKey === "CORPORATE") return "CORPORATE_SUBSCRIPTION";
  return "OTHER";
}

async function resolveSubscriptionPaymentPurposeId(
  tx: Prisma.TransactionClient,
  planTypeLookupKey: string | null | undefined,
): Promise<string> {
  const purposeKey = planTypeLookupKeyToPaymentPurposeKey(planTypeLookupKey);
  return requireLookupId(tx, "PAYMENT_PURPOSE", purposeKey);
}

/**
 * Creates subscription invoice, ledger entries (DEBIT charge + CREDIT payments), and updates
 * subscription account outstanding balance by the unpaid remainder (balance due).
 */
export async function createSubscriptionInvoiceWithLedger(
  tx: Prisma.TransactionClient,
  params: {
    subscriptionAccountId: string;
    /** Omit or null for corporate bills (invoice billed to subscription account only). */
    patientId?: string | null;
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
      planTypeLookup: { select: { lookupKey: true } },
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

  const resolvedPatientId = params.patientId?.trim() || null;

  const invoice = await tx.invoice.create({
    data: {
      patientId: resolvedPatientId,
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

  const paymentPurposeId = await resolveSubscriptionPaymentPurposeId(
    tx,
    plan.planTypeLookup?.lookupKey,
  );

  for (const p of params.payments) {
    const amt = new Prisma.Decimal(p.amountPaid);
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amountPaid: amt,
        paymentMethodId: p.paymentMethodId.trim(),
        paymentPurposeId,
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

export type OutstandingSubscriptionInvoiceRow = {
  id: string;
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  subscriptionAccountId: string;
  accountName: string | null;
  planName: string;
  patientName: string | null;
  /** PAYMENT_PURPOSE id for payments on this invoice (fixed from plan type). */
  suggestedPaymentPurposeId: string;
  /** Display label for {@link suggestedPaymentPurposeId}. */
  suggestedPaymentPurposeLabel: string;
};

export async function listOutstandingSubscriptionInvoices(): Promise<
  OutstandingSubscriptionInvoiceRow[]
> {
  const rows = await prisma.invoice.findMany({
    where: {
      subscriptionAccountId: { not: null },
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
      subscriptionAccountId: true,
      subscriptionAccount: {
        select: {
          accountName: true,
          plan: {
            select: {
              planName: true,
              planTypeLookup: { select: { lookupKey: true } },
            },
          },
        },
      },
      patient: { select: { fullName: true } },
    },
  });

  const out: OutstandingSubscriptionInvoiceRow[] = [];
  for (const r of rows) {
    const suggestedPaymentPurposeId = await resolveSubscriptionPaymentPurposeId(
      prisma,
      r.subscriptionAccount?.plan?.planTypeLookup?.lookupKey,
    );
    const purposeRow = await prisma.lookup.findUnique({
      where: { id: suggestedPaymentPurposeId },
      select: { lookupValue: true },
    });
    out.push({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      balanceDue: r.balanceDue.toString(),
      totalAmount: r.totalAmount.toString(),
      paidAmount: r.paidAmount.toString(),
      subscriptionAccountId: r.subscriptionAccountId!,
      accountName: r.subscriptionAccount?.accountName ?? null,
      planName: r.subscriptionAccount?.plan?.planName ?? "—",
      patientName: r.patient?.fullName ?? null,
      suggestedPaymentPurposeId,
      suggestedPaymentPurposeLabel: purposeRow?.lookupValue ?? "—",
    });
  }
  return out;
}

export async function recordSubscriptionInvoicePayment(params: {
  invoiceId: string;
  amountPaid: string | number;
  paymentMethodId: string;
  transactionRef?: string | null;
  collectedByUserId: string;
}): Promise<{ invoiceId: string; balanceDue: string }> {
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { id: params.invoiceId },
      select: {
        id: true,
        subscriptionAccountId: true,
        paidAmount: true,
        balanceDue: true,
        subscriptionAccount: {
          select: {
            plan: {
              select: { planTypeLookup: { select: { lookupKey: true } } },
            },
          },
        },
      },
    });

    if (!invoice?.subscriptionAccountId) {
      throw new Error("Invoice is not a subscription invoice");
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

    const paymentPurposeId = await resolveSubscriptionPaymentPurposeId(
      tx,
      invoice.subscriptionAccount?.plan?.planTypeLookup?.lookupKey,
    );

    const creditTypeId = await requireLookupId(tx, "ACCOUNT_TRANSACTION_TYPE", "CREDIT");

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

    await tx.accountTransaction.create({
      data: {
        subscriptionAccountId: invoice.subscriptionAccountId,
        transactionTypeId: creditTypeId,
        amount: amt,
        description: "Subscription payment",
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

    await tx.subscriptionAccount.update({
      where: { id: invoice.subscriptionAccountId },
      data: {
        outstandingBalance: { decrement: amt },
      },
    });

    return { invoiceId: invoice.id, balanceDue: newBalance.toString() };
  });

  void notifySubscriptionPaymentRecorded(result.invoiceId);

  return result;
}
