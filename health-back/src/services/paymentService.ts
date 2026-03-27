import prisma from "../prisma/client";

export type PaymentListRow = {
  id: string;
  paidAt: string;
  amountPaid: string;
  transactionRef: string | null;
  paymentMethod: string;
  invoiceId: string;
  patientId: string;
  patientName: string;
  subscriptionAccountId: string | null;
  subscriptionAccountName: string | null;
  planName: string | null;
  collectedById: string;
  collectedByName: string;
};

const LIST_LIMIT = 200;

export async function listPayments(): Promise<PaymentListRow[]> {
  const rows = await prisma.payment.findMany({
    orderBy: { paidAt: "desc" },
    take: LIST_LIMIT,
    include: {
      paymentMethodLookup: { select: { lookupValue: true } },
      collectedBy: { select: { id: true, fullName: true, email: true } },
      invoice: {
        select: {
          id: true,
          patient: { select: { id: true, fullName: true } },
          subscriptionAccount: {
            select: {
              id: true,
              accountName: true,
              plan: { select: { planName: true } },
            },
          },
        },
      },
    },
  });

  return rows.map((p) => ({
    id: p.id,
    paidAt: p.paidAt.toISOString(),
    amountPaid: p.amountPaid.toString(),
    transactionRef: p.transactionRef,
    paymentMethod: p.paymentMethodLookup.lookupValue,
    invoiceId: p.invoice.id,
    patientId: p.invoice.patient.id,
    patientName: p.invoice.patient.fullName,
    subscriptionAccountId: p.invoice.subscriptionAccount?.id ?? null,
    subscriptionAccountName: p.invoice.subscriptionAccount?.accountName ?? null,
    planName: p.invoice.subscriptionAccount?.plan?.planName ?? null,
    collectedById: p.collectedBy.id,
    collectedByName: p.collectedBy.fullName || p.collectedBy.email,
  }));
}
