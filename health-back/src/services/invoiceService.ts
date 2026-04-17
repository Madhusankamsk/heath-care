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

function mapOutstandingInvoiceRow(
  row: {
    id: string;
    invoiceTypeLookup: { lookupKey: string };
    createdAt: Date;
    balanceDue: unknown;
    totalAmount: unknown;
    paidAmount: unknown;
    membershipInvoice: {
      patientId: string | null;
      patient: { fullName: string } | null;
      subscriptionAccountId: string | null;
      subscriptionAccount: {
        accountName: string | null;
        plan: { planName: string | null } | null;
      } | null;
    } | null;
    visitInvoice: {
      patientId: string | null;
      patient: { fullName: string } | null;
      bookingId: string | null;
      booking: { scheduledDate: Date | null } | null;
    } | null;
  },
): OutstandingInvoiceRow {
  const member = row.membershipInvoice;
  const visit = row.visitInvoice;
  const patient = member?.patient ?? visit?.patient ?? null;
  return {
    id: row.id,
    invoiceType: row.invoiceTypeLookup.lookupKey === "MEMBERSHIP" ? "MEMBERSHIP" : "VISIT",
    createdAt: row.createdAt.toISOString(),
    balanceDue: String(row.balanceDue),
    totalAmount: String(row.totalAmount),
    paidAmount: String(row.paidAmount),
    patientId: member?.patientId ?? visit?.patientId ?? null,
    patientName: patient?.fullName ?? null,
    subscriptionAccountId: member?.subscriptionAccountId ?? null,
    accountName: member?.subscriptionAccount?.accountName ?? null,
    planName: member?.subscriptionAccount?.plan?.planName ?? null,
    bookingId: visit?.bookingId ?? null,
    bookingScheduledDate: visit?.booking?.scheduledDate?.toISOString() ?? null,
  };
}

export async function listOutstandingInvoices(params: { skip: number; take: number }): Promise<{
  items: OutstandingInvoiceRow[];
  total: number;
}> {
  const where = { balanceDue: { gt: 0 } };

  const [total, rows] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
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
  }),
  ]);

  const items = rows.map((row) => mapOutstandingInvoiceRow(row as Parameters<typeof mapOutstandingInvoiceRow>[0]));
  return { items, total };
}
