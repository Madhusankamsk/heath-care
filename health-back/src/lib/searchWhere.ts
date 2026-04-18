import type { Prisma } from "@prisma/client";

export const SEARCH_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const UUID_RE = SEARCH_UUID_RE;

/** OR filter on common patient text fields (case-insensitive contains). */
export function patientTextSearchWhere(term: string): Prisma.PatientWhereInput {
  const q = term.trim();
  if (!q) return {};

  return {
    OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { shortName: { contains: q, mode: "insensitive" } },
      { nicOrPassport: { contains: q, mode: "insensitive" } },
      { contactNo: { contains: q, mode: "insensitive" } },
      { whatsappNo: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ],
  };
}

/** Merge base `where` with optional patient text search. */
export function andPatientSearch(
  base: Prisma.PatientWhereInput,
  q: string | undefined,
): Prisma.PatientWhereInput {
  const search = q ? patientTextSearchWhere(q) : {};
  if (!q || Object.keys(search).length === 0) return base;
  return { AND: [base, search] };
}

/** Booking list: remark + related patient fields + optional id match when q is a UUID. */
export function bookingListTextSearchWhere(term: string): Prisma.BookingWhereInput {
  const q = term.trim();
  if (!q) return {};

  const patientOr: Prisma.PatientWhereInput = {
    OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { nicOrPassport: { contains: q, mode: "insensitive" } },
      { contactNo: { contains: q, mode: "insensitive" } },
    ],
  };

  const or: Prisma.BookingWhereInput[] = [
    { bookingRemark: { contains: q, mode: "insensitive" } },
    { patient: { is: patientOr } },
  ];

  if (UUID_RE.test(q)) {
    or.unshift({ id: q });
  }

  return { OR: or };
}

export function andBookingSearch(
  base: Prisma.BookingWhereInput | undefined,
  q: string | undefined,
): Prisma.BookingWhereInput | undefined {
  if (!q?.trim()) return base;
  const search = bookingListTextSearchWhere(q);
  if (!base || Object.keys(base).length === 0) return search;
  return { AND: [base, search] };
}

/** Merge dispatch/upcoming/ongoing booking filters with text search. */
export function mergeBookingWhere(
  base: Prisma.BookingWhereInput,
  q: string | undefined,
): Prisma.BookingWhereInput {
  if (!q?.trim()) return base;
  return { AND: [base, bookingListTextSearchWhere(q)] };
}

export function userProfileTextSearchWhere(term: string): Prisma.UserWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phoneNumber: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function vehicleTextSearchWhere(term: string): Prisma.VehicleWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { vehicleNo: { contains: q, mode: "insensitive" } },
      { model: { contains: q, mode: "insensitive" } },
      { status: { contains: q, mode: "insensitive" } },
      {
        currentDriver: {
          is: {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ],
  };
}

export function medicalTeamTextSearchWhere(term: string): Prisma.MedicalTeamWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { teamName: { contains: q, mode: "insensitive" } },
      { vehicle: { is: { vehicleNo: { contains: q, mode: "insensitive" } } } },
      { vehicle: { is: { model: { contains: q, mode: "insensitive" } } } },
    ],
  };
}

export function permissionKeySearchWhere(term: string): Prisma.PermissionWhereInput {
  const q = term.trim();
  if (!q) return {};
  return { permissionKey: { contains: q, mode: "insensitive" } };
}

export function roleTextSearchWhere(term: string): Prisma.RoleWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { roleName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function subscriptionPlanTextSearchWhere(term: string): Prisma.SubscriptionPlanWhereInput {
  const q = term.trim();
  if (!q) return {};
  return { planName: { contains: q, mode: "insensitive" } };
}

export function subscriptionAccountListSearchWhere(term: string): Prisma.SubscriptionAccountWhereInput {
  const q = term.trim();
  if (!q) return {};
  const patientSearch = patientTextSearchWhere(q);
  return {
    OR: [
      { accountName: { contains: q, mode: "insensitive" } },
      { registrationNo: { contains: q, mode: "insensitive" } },
      { contactEmail: { contains: q, mode: "insensitive" } },
      { contactPhone: { contains: q, mode: "insensitive" } },
      { whatsappNo: { contains: q, mode: "insensitive" } },
      { members: { some: { patient: { is: patientSearch } } } },
    ],
  };
}

export function medicineTextSearchWhere(term: string): Prisma.MedicineWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { genericName: { contains: q, mode: "insensitive" } },
      { uom: { contains: q, mode: "insensitive" } },
    ],
  };
}

export function inventoryBatchTextSearchWhere(term: string): Prisma.InventoryBatchWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { batchNo: { contains: q, mode: "insensitive" } },
      { locationId: { contains: q, mode: "insensitive" } },
      { medicine: { is: { name: { contains: q, mode: "insensitive" } } } },
      { medicine: { is: { genericName: { contains: q, mode: "insensitive" } } } },
    ],
  };
}

export function stockTransferTextSearchWhere(term: string): Prisma.StockTransferWhereInput {
  const q = term.trim();
  if (!q) return {};
  return {
    OR: [
      { fromLocationId: { contains: q, mode: "insensitive" } },
      { toLocationId: { contains: q, mode: "insensitive" } },
      { medicine: { is: { name: { contains: q, mode: "insensitive" } } } },
      { batch: { is: { batchNo: { contains: q, mode: "insensitive" } } } },
      { transferredBy: { is: { fullName: { contains: q, mode: "insensitive" } } } },
      { transferredBy: { is: { email: { contains: q, mode: "insensitive" } } } },
    ],
  };
}

export function paymentListTextSearchWhere(term: string): Prisma.PaymentWhereInput {
  const q = term.trim();
  if (!q) return {};
  const or: Prisma.PaymentWhereInput[] = [
    { transactionRef: { contains: q, mode: "insensitive" } },
    { collectedBy: { is: userProfileTextSearchWhere(q) } },
    {
      invoice: {
        is: {
          OR: [
            {
              membershipInvoice: {
                is: { patient: { is: patientTextSearchWhere(q) } },
              },
            },
            {
              visitInvoice: { is: { patient: { is: patientTextSearchWhere(q) } } },
            },
          ],
        },
      },
    },
  ];
  if (UUID_RE.test(q)) {
    or.unshift({ id: q });
    or.push({ invoice: { is: { id: q } } });
  }
  return { OR: or };
}

export function invoiceOutstandingTextSearchWhere(term: string): Prisma.InvoiceWhereInput {
  const q = term.trim();
  if (!q) return {};
  const or: Prisma.InvoiceWhereInput[] = [
    { membershipInvoice: { is: { patient: { is: patientTextSearchWhere(q) } } } },
    { visitInvoice: { is: { patient: { is: patientTextSearchWhere(q) } } } },
    {
      membershipInvoice: {
        is: {
          subscriptionAccount: {
            is: {
              OR: [
                { accountName: { contains: q, mode: "insensitive" } },
                { registrationNo: { contains: q, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    },
  ];
  if (UUID_RE.test(q)) {
    or.unshift({ id: q });
  }
  return { OR: or };
}

export function visitOutstandingInvoiceTextSearchWhere(term: string): Prisma.InvoiceWhereInput {
  const q = term.trim();
  if (!q) return {};
  const or: Prisma.InvoiceWhereInput[] = [
    { visitInvoice: { is: { patient: { is: patientTextSearchWhere(q) } } } },
  ];
  if (UUID_RE.test(q)) {
    or.unshift({ id: q });
    or.push({ visitInvoice: { is: { bookingId: q } } });
  }
  return { OR: or };
}

export function subscriptionOutstandingInvoiceTextSearchWhere(
  term: string,
): Prisma.InvoiceWhereInput {
  const q = term.trim();
  if (!q) return {};
  const or: Prisma.InvoiceWhereInput[] = [
    { membershipInvoice: { is: { patient: { is: patientTextSearchWhere(q) } } } },
    {
      membershipInvoice: {
        is: {
          subscriptionAccount: {
            is: {
              OR: [
                { accountName: { contains: q, mode: "insensitive" } },
                { plan: { is: { planName: { contains: q, mode: "insensitive" } } } },
              ],
            },
          },
        },
      },
    },
  ];
  if (UUID_RE.test(q)) {
    or.unshift({ id: q });
  }
  return { OR: or };
}
