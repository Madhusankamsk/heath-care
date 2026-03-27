import prisma from "../prisma/client";

export type BookingListScope = "all" | "own";

type BookingPayload = {
  patientId: string;
  scheduledDate?: string | Date | null;
  bookingRemark?: string | null;
  requestedDoctorId?: string | null;
};

function parseScheduledDate(value: string | Date | null) {
  if (value === null || value === "") return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid scheduledDate");
  }
  return date;
}

export function resolveBookingListScope(
  permissionKeys: string[],
): BookingListScope {
  if (permissionKeys.includes("bookings:scope_all")) return "all";
  if (permissionKeys.includes("bookings:scope_own")) return "own";
  return "all";
}

async function getDoctorStatusLookupId(
  lookupKey: string,
): Promise<string | null> {
  const cat = await prisma.lookupCategory.findUnique({
    where: { categoryName: "DOCTOR_BOOKING_STATUS" },
  });
  if (!cat) return null;
  const row = await prisma.lookup.findFirst({
    where: { categoryId: cat.id, lookupKey },
  });
  return row?.id ?? null;
}

const bookingInclude = {
  patient: { select: { id: true, fullName: true, nicOrPassport: true, contactNo: true } },
  requestedDoctor: { select: { id: true, fullName: true, email: true } },
  doctorStatusLookup: {
    select: { id: true, lookupKey: true, lookupValue: true },
  },
} as const;

export async function listBookings(params: {
  userId: string | undefined;
  scope: BookingListScope;
}) {
  const where =
    params.scope === "own" && params.userId
      ? { requestedDoctorId: params.userId }
      : undefined;

  return prisma.booking.findMany({
    where,
    orderBy: { scheduledDate: "desc" },
    include: bookingInclude,
  });
}

export async function getBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
}

export async function createBooking(data: BookingPayload) {
  const scheduled =
    data.scheduledDate === undefined ? null : parseScheduledDate(data.scheduledDate ?? null);

  const requestedDoctorId =
    data.requestedDoctorId?.trim() ? data.requestedDoctorId.trim() : null;

  const doctorStatusId = await getDoctorStatusLookupId("PENDING");

  return prisma.booking.create({
    data: {
      patientId: data.patientId,
      scheduledDate: scheduled,
      bookingRemark: data.bookingRemark?.trim()
        ? data.bookingRemark.trim()
        : null,
      requestedDoctorId,
      doctorStatusId,
    },
    include: bookingInclude,
  });
}

export async function updateBooking(
  id: string,
  data: {
    patientId?: string;
    scheduledDate?: string | Date | null;
    bookingRemark?: string | null;
    requestedDoctorId?: string | null;
    doctorStatusId?: string | null;
  },
) {
  const clearingDoctor =
    data.requestedDoctorId !== undefined &&
    (data.requestedDoctorId === null ||
      (typeof data.requestedDoctorId === "string" && !data.requestedDoctorId.trim()));

  let doctorStatusId:
    | string
    | null
    | undefined;

  if (clearingDoctor) {
    doctorStatusId = await getDoctorStatusLookupId("PENDING");
  } else if (data.doctorStatusId !== undefined) {
    doctorStatusId =
      data.doctorStatusId === null ? null : data.doctorStatusId.trim();
  } else {
    doctorStatusId = undefined;
  }

  return prisma.booking.update({
    where: { id },
    data: {
      patientId: data.patientId,
      scheduledDate:
        data.scheduledDate === undefined
          ? undefined
          : data.scheduledDate === null
            ? null
            : parseScheduledDate(data.scheduledDate),
      bookingRemark:
        data.bookingRemark === undefined
          ? undefined
          : data.bookingRemark === null
            ? null
            : data.bookingRemark,
      requestedDoctorId: data.requestedDoctorId === undefined
        ? undefined
        : data.requestedDoctorId === null
          ? null
          : data.requestedDoctorId.trim(),
      doctorStatusId,
    },
    include: bookingInclude,
  });
}

export async function deleteBooking(id: string) {
  return prisma.booking.delete({ where: { id } });
}
