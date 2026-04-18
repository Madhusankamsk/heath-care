import prisma from "../prisma/client";

import { paymentListTextSearchWhere } from "../lib/searchWhere";

export type PaymentListRow = {
  id: string;
  paidAt: string;
  amountPaid: string;
  transactionRef: string | null;
  paySlipUrl: string | null;
  paymentMethod: string;
  /** PAYMENT_PURPOSE lookup label, if set. */
  paymentPurpose: string | null;
  invoiceId: string;
  patientId: string | null;
  patientName: string;
  subscriptionAccountId: string | null;
  subscriptionAccountName: string | null;
  planName: string | null;
  collectedById: string;
  collectedByName: string;
  invoiceType: "MEMBERSHIP" | "VISIT";
};

const COLLECTOR_METHOD_KEYS = new Set(["CASH", "CHEQUE"]);

export async function listPayments(params: {
  skip: number;
  take: number;
  q?: string;
}): Promise<{ items: PaymentListRow[]; total: number }> {
  const where = params.q?.trim() ? paymentListTextSearchWhere(params.q) : {};
  const [total, rows] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: {
      paymentMethodLookup: { select: { lookupValue: true } },
      paymentPurposeLookup: { select: { lookupValue: true } },
      collectedBy: { select: { id: true, fullName: true, email: true } },
      invoice: {
        select: {
          id: true,
          invoiceTypeLookup: { select: { lookupKey: true } },
          membershipInvoice: {
            select: {
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
          visitInvoice: {
            select: {
              patient: { select: { id: true, fullName: true } },
            },
          },
        },
      },
    },
  }),
  ]);

  const items = rows.map((p) => {
    const member = p.invoice.membershipInvoice;
    const visit = p.invoice.visitInvoice;
    const patient = member?.patient ?? visit?.patient ?? null;
    const accName = member?.subscriptionAccount?.accountName ?? null;
    return {
      id: p.id,
      paidAt: p.paidAt.toISOString(),
      amountPaid: p.amountPaid.toString(),
      transactionRef: p.transactionRef,
      paySlipUrl: p.paySlipUrl,
      paymentMethod: p.paymentMethodLookup.lookupValue,
      paymentPurpose: p.paymentPurposeLookup?.lookupValue ?? null,
      invoiceId: p.invoice.id,
      patientId: patient?.id ?? null,
      patientName: patient?.fullName ?? accName ?? "—",
      subscriptionAccountId: member?.subscriptionAccount?.id ?? null,
      subscriptionAccountName: accName,
      planName: member?.subscriptionAccount?.plan?.planName ?? null,
      collectedById: p.collectedBy.id,
      collectedByName: p.collectedBy.fullName || p.collectedBy.email,
      invoiceType: (p.invoice.invoiceTypeLookup.lookupKey === "MEMBERSHIP" ? "MEMBERSHIP" : "VISIT") as PaymentListRow["invoiceType"],
    };
  });

  return { items, total };
}

export type CollectorDailySummaryRow = {
  collectorId: string;
  collectorName: string;
  paymentMethodKey: string;
  paymentMethodLabel: string;
  paymentCount: number;
  totalAmount: string;
  settledAmount: string;
  pendingAmount: string;
  isSettled: boolean;
  settledAt: string | null;
  settledByName: string | null;
};

function parseDateBounds(dateInput?: string) {
  const base = dateInput?.trim() ? new Date(`${dateInput.trim()}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(base.getTime())) throw new Error("Invalid date");
  const y = base.getUTCFullYear();
  const m = base.getUTCMonth();
  const d = base.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
  const isoDate = start.toISOString().slice(0, 10);
  return { start, end, isoDate };
}

export async function listCollectorDailySummary(dateInput?: string) {
  const { start, end, isoDate } = parseDateBounds(dateInput);

  const [payments, settlements] = await Promise.all([
    prisma.payment.findMany({
      where: { paidAt: { gte: start, lt: end } },
      include: {
        collectedBy: { select: { id: true, fullName: true, email: true } },
        paymentMethodLookup: { select: { lookupKey: true, lookupValue: true } },
      },
    }),
    prisma.paymentCollectorSettlement.findMany({
      where: { settledDate: start },
      include: { settledBy: { select: { fullName: true, email: true } } },
    }),
  ]);

  const settlementMap = new Map(
    settlements.map((s) => [`${s.collectorId}:${s.paymentMethodKey}`, s] as const),
  );

  const grouped = new Map<
    string,
    {
      collectorId: string;
      collectorName: string;
      paymentMethodKey: string;
      paymentMethodLabel: string;
      paymentCount: number;
      totalAmount: number;
    }
  >();

  for (const p of payments) {
    const keyFromLookup = p.paymentMethodLookup.lookupKey?.trim().toUpperCase() ?? "";
    const valueFallback = p.paymentMethodLookup.lookupValue?.trim().toUpperCase() ?? "";
    const methodKey = COLLECTOR_METHOD_KEYS.has(keyFromLookup)
      ? keyFromLookup
      : COLLECTOR_METHOD_KEYS.has(valueFallback)
        ? valueFallback
        : "";
    if (!methodKey) continue;

    const mapKey = `${p.collectedBy.id}:${methodKey}`;
    const label = p.paymentMethodLookup.lookupValue?.trim() || methodKey;
    const collectorName = p.collectedBy.fullName?.trim() || p.collectedBy.email;
    const prev = grouped.get(mapKey);
    const amount = Number(p.amountPaid);
    if (prev) {
      prev.paymentCount += 1;
      prev.totalAmount += Number.isFinite(amount) ? amount : 0;
    } else {
      grouped.set(mapKey, {
        collectorId: p.collectedBy.id,
        collectorName,
        paymentMethodKey: methodKey,
        paymentMethodLabel: label,
        paymentCount: 1,
        totalAmount: Number.isFinite(amount) ? amount : 0,
      });
    }
  }

  const rows: CollectorDailySummaryRow[] = [...grouped.values()].map((g) => {
    const settlement = settlementMap.get(`${g.collectorId}:${g.paymentMethodKey}`);
    const settledAmount = settlement ? Number(settlement.totalAmountAtSettle) : 0;
    const pendingAmount = Math.max(g.totalAmount - settledAmount, 0);
    return {
      collectorId: g.collectorId,
      collectorName: g.collectorName,
      paymentMethodKey: g.paymentMethodKey,
      paymentMethodLabel: g.paymentMethodLabel,
      paymentCount: g.paymentCount,
      totalAmount: g.totalAmount.toFixed(2),
      settledAmount: settledAmount.toFixed(2),
      pendingAmount: pendingAmount.toFixed(2),
      isSettled: Boolean(settlement && pendingAmount <= 0),
      settledAt: settlement?.settledAt?.toISOString() ?? null,
      settledByName: settlement
        ? settlement.settledBy?.fullName?.trim() || settlement.settledBy?.email || null
        : null,
    };
  });

  rows.sort((a, b) => a.collectorName.localeCompare(b.collectorName) || a.paymentMethodKey.localeCompare(b.paymentMethodKey));

  return { date: isoDate, rows };
}

export async function listCollectorDailySummaryPaginated(
  dateInput: string | undefined,
  params: { skip: number; take: number; q?: string },
) {
  const { date: isoDate, rows: allRows } = await listCollectorDailySummary(dateInput);
  const qt = params.q?.trim().toLowerCase();
  const rows = qt
    ? allRows.filter(
        (r) =>
          r.collectorName.toLowerCase().includes(qt) ||
          r.paymentMethodLabel.toLowerCase().includes(qt) ||
          r.paymentMethodKey.toLowerCase().includes(qt),
      )
    : allRows;
  const total = rows.length;
  const grandTotalCollected = rows.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
  const grandPendingSettlement = rows.reduce((sum, r) => sum + (Number(r.pendingAmount) || 0), 0);
  const items = rows.slice(params.skip, params.skip + params.take);
  return { date: isoDate, items, total, grandTotalCollected, grandPendingSettlement };
}

export async function settleCollectorDaily({
  date,
  collectorId,
  paymentMethodKey,
  settledByUserId,
}: {
  date?: string;
  collectorId: string;
  paymentMethodKey: string;
  settledByUserId?: string;
}) {
  const { start, end } = parseDateBounds(date);
  const methodKey = paymentMethodKey.trim().toUpperCase();
  if (!collectorId.trim()) throw new Error("collectorId is required");
  if (!COLLECTOR_METHOD_KEYS.has(methodKey)) throw new Error("paymentMethodKey must be CASH or CHEQUE");

  const payments = await prisma.payment.findMany({
    where: {
      collectedById: collectorId,
      paidAt: { gte: start, lt: end },
      OR: [
        { paymentMethodLookup: { is: { lookupKey: methodKey } } },
        { paymentMethodLookup: { is: { lookupValue: methodKey } } },
      ],
    },
    select: { amountPaid: true },
  });

  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);

  const settled = await prisma.paymentCollectorSettlement.upsert({
    where: {
      collectorId_settledDate_paymentMethodKey: {
        collectorId,
        settledDate: start,
        paymentMethodKey: methodKey,
      },
    },
    update: {
      totalAmountAtSettle: totalAmount,
      settledAt: new Date(),
      settledById: settledByUserId?.trim() || null,
    },
    create: {
      collectorId,
      settledDate: start,
      paymentMethodKey: methodKey,
      totalAmountAtSettle: totalAmount,
      settledById: settledByUserId?.trim() || null,
    },
  });

  return {
    id: settled.id,
    collectorId: settled.collectorId,
    paymentMethodKey: settled.paymentMethodKey,
    settledDate: settled.settledDate.toISOString().slice(0, 10),
    totalAmountAtSettle: settled.totalAmountAtSettle.toString(),
    settledAt: settled.settledAt.toISOString(),
  };
}
