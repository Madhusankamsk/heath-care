import prisma from "../prisma/client";

export type OutstandingInvoiceRow = {
  id: string;
  invoiceType: "MEMBERSHIP" | "VISIT";
  createdAt: string;
  balanceDue: string;
  totalAmount: string;
  paidAmount: string;
  patientId: string | null;
  patientName: string | null;
  subscriptionAccountId: string | null;
  accountName: string | null;
  planName: string | null;
  bookingId: string | null;
  bookingScheduledDate: string | null;
};

export async function listOutstandingInvoices(): Promise<OutstandingInvoiceRow[]> {
  const rows = await prisma.invoice.findMany({
    where: { balanceDue: { gt: 0 } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      invoiceTypeLookup: { select: { lookupKey: true } },
      createdAt: true,
      balanceDue: true,
      totalAmount: true,
      paidAmount: true,
      membershipInvoice: {
        select: {
          patientId: true,
          patient: { select: { fullName: true } },
          subscriptionAccountId: true,
          subscriptionAccount: {
            select: { accountName: true, plan: { select: { planName: true } } },
          },
        },
      },
      visitInvoice: {
        select: {
          patientId: true,
          patient: { select: { fullName: true } },
          bookingId: true,
          booking: { select: { scheduledDate: true } },
        },
      },
    },
  });

  return rows.map((row) => {
    const member = row.membershipInvoice;
    const visit = row.visitInvoice;
    const patient = member?.patient ?? visit?.patient ?? null;
    return {
      id: row.id,
      invoiceType:
        row.invoiceTypeLookup.lookupKey === "MEMBERSHIP" ? "MEMBERSHIP" : "VISIT",
      createdAt: row.createdAt.toISOString(),
      balanceDue: row.balanceDue.toString(),
      totalAmount: row.totalAmount.toString(),
      paidAmount: row.paidAmount.toString(),
      patientId: member?.patientId ?? visit?.patientId ?? null,
      patientName: patient?.fullName ?? null,
      subscriptionAccountId: member?.subscriptionAccountId ?? null,
      accountName: member?.subscriptionAccount?.accountName ?? null,
      planName: member?.subscriptionAccount?.plan?.planName ?? null,
      bookingId: visit?.bookingId ?? null,
      bookingScheduledDate: visit?.booking?.scheduledDate?.toISOString() ?? null,
    };
  });
}
