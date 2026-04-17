import { Prisma } from "@prisma/client";

import prisma from "../prisma/client";

const ITEM_MARKER = "__ITEM__:";

function encodeGenericName(kind: "medicine" | "item", genericName?: string | null) {
  const base = (genericName ?? "").trim();
  if (kind === "item") return `${ITEM_MARKER}${base}`;
  return base.replace(ITEM_MARKER, "");
}

function decodeGenericName(value?: string | null) {
  const raw = value ?? "";
  if (raw.startsWith(ITEM_MARKER)) return raw.slice(ITEM_MARKER.length).trim();
  return raw;
}

function medicineKindWhere(kind: "medicine" | "item"): Prisma.MedicineWhereInput {
  if (kind === "item") return { genericName: { startsWith: ITEM_MARKER } };
  return { OR: [{ genericName: null }, { genericName: { not: { startsWith: ITEM_MARKER } } }] };
}

async function getLookupId(categoryName: string, lookupKey: string) {
  const row = await prisma.lookup.findFirst({
    where: { category: { categoryName }, lookupKey },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function listMedicines(
  kind: "medicine" | "item",
  params: { skip: number; take: number },
) {
  const where = medicineKindWhere(kind);
  const [total, rows] = await prisma.$transaction([
    prisma.medicine.count({ where }),
    prisma.medicine.findMany({
      where,
      include: { uomLookup: true, inventoryBatches: true },
      orderBy: { name: "asc" },
      skip: params.skip,
      take: params.take,
    }),
  ]);
  const items = rows.map((row) => ({
    ...row,
    genericName: decodeGenericName(row.genericName),
    totalQuantity: row.inventoryBatches.reduce((sum, b) => sum + b.quantity, 0),
  }));
  return { items, total };
}

export async function createMedicine(
  kind: "medicine" | "item",
  input: {
    name: string;
    genericName?: string | null;
    sellingPrice: number;
    uom?: string | null;
    uomId?: string | null;
    minStockLevel?: number | null;
  },
) {
  const created = await prisma.medicine.create({
    data: {
      name: input.name.trim(),
      genericName: encodeGenericName(kind, input.genericName),
      sellingPrice: input.sellingPrice,
      uom: input.uom?.trim() || null,
      uomId: input.uomId?.trim() || null,
      minStockLevel: input.minStockLevel ?? null,
    },
  });
  return { ...created, genericName: decodeGenericName(created.genericName) };
}

export async function getMedicine(kind: "medicine" | "item", id: string) {
  const row = await prisma.medicine.findUnique({
    where: { id },
    include: { uomLookup: true, inventoryBatches: true },
  });
  if (!row) return null;
  if (kind === "item" && !String(row.genericName ?? "").startsWith(ITEM_MARKER)) return null;
  if (kind === "medicine" && String(row.genericName ?? "").startsWith(ITEM_MARKER)) return null;
  return { ...row, genericName: decodeGenericName(row.genericName) };
}

export async function updateMedicine(
  kind: "medicine" | "item",
  id: string,
  input: {
    name: string;
    genericName?: string | null;
    sellingPrice: number;
    uom?: string | null;
    uomId?: string | null;
    minStockLevel?: number | null;
  },
) {
  const found = await getMedicine(kind, id);
  if (!found) return null;
  const updated = await prisma.medicine.update({
    where: { id },
    data: {
      name: input.name.trim(),
      genericName: encodeGenericName(kind, input.genericName),
      sellingPrice: input.sellingPrice,
      uom: input.uom?.trim() || null,
      uomId: input.uomId?.trim() || null,
      minStockLevel: input.minStockLevel ?? null,
    },
  });
  return { ...updated, genericName: decodeGenericName(updated.genericName) };
}

export async function deleteMedicine(kind: "medicine" | "item", id: string) {
  const found = await getMedicine(kind, id);
  if (!found) return false;
  await prisma.medicine.delete({ where: { id } });
  return true;
}

export async function listBatches(params: { skip: number; take: number }) {
  const where = {};
  const [total, rows] = await prisma.$transaction([
    prisma.inventoryBatch.count({ where }),
    prisma.inventoryBatch.findMany({
      where,
      include: {
        medicine: true,
        locationTypeLookup: true,
      },
      orderBy: [{ expiryDate: "asc" }, { batchNo: "asc" }],
      skip: params.skip,
      take: params.take,
    }),
  ]);
  const items = rows.map((row) => ({
    ...row,
    medicine: { ...row.medicine, genericName: decodeGenericName(row.medicine.genericName) },
  }));
  return { items, total };
}

export async function createBatch(input: {
  medicineId: string;
  batchNo: string;
  expiryDate: string;
  quantity: number;
  buyingPrice: number;
  locationType?: string;
  locationId?: string | null;
}) {
  const locationType = (input.locationType || "WAREHOUSE").toUpperCase();
  const locationTypeId = await getLookupId("INVENTORY_LOCATION_TYPE", locationType);
  return prisma.inventoryBatch.create({
    data: {
      medicineId: input.medicineId,
      batchNo: input.batchNo.trim(),
      expiryDate: new Date(input.expiryDate),
      quantity: input.quantity,
      buyingPrice: input.buyingPrice,
      locationType,
      locationTypeId,
      locationId: input.locationId?.trim() || null,
    },
  });
}

export async function updateBatch(
  id: string,
  input: {
    batchNo: string;
    expiryDate: string;
    quantity: number;
    buyingPrice: number;
    locationType?: string;
    locationId?: string | null;
  },
) {
  const locationType = (input.locationType || "WAREHOUSE").toUpperCase();
  const locationTypeId = await getLookupId("INVENTORY_LOCATION_TYPE", locationType);
  return prisma.inventoryBatch.update({
    where: { id },
    data: {
      batchNo: input.batchNo.trim(),
      expiryDate: new Date(input.expiryDate),
      quantity: input.quantity,
      buyingPrice: input.buyingPrice,
      locationType,
      locationTypeId,
      locationId: input.locationId?.trim() || null,
    },
  });
}

export async function deleteBatch(id: string) {
  await prisma.inventoryBatch.delete({ where: { id } });
}

export async function listMobileSubstores() {
  const nurseLookupId = await getLookupId("INVENTORY_LOCATION_TYPE", "NURSE");
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" },
  });

  const batches = await prisma.inventoryBatch.findMany({
    where: nurseLookupId
      ? { locationTypeId: nurseLookupId }
      : { OR: [{ locationType: "NURSE" }, { locationType: "USER" }] },
    include: { medicine: true },
  });

  const grouped = users.map((u) => {
    const userBatches = batches.filter((b) => b.locationId === u.id);
    return {
      user: u,
      totalQuantity: userBatches.reduce((sum, b) => sum + b.quantity, 0),
      batches: userBatches.map((b) => ({
        ...b,
        medicine: { ...b.medicine, genericName: decodeGenericName(b.medicine.genericName) },
      })),
    };
  });

  return grouped.filter((g) => g.totalQuantity > 0 || g.batches.length > 0);
}

export async function listMobileSubstoresPaginated(params: { skip: number; take: number }) {
  const full = await listMobileSubstores();
  const total = full.length;
  const items = full.slice(params.skip, params.skip + params.take);
  return { items, total };
}

async function moveBatchQuantity(
  tx: Prisma.TransactionClient,
  fromBatchId: string,
  quantity: number,
  to: { locationType: string; locationId: string | null },
) {
  const fromBatch = await tx.inventoryBatch.findUnique({ where: { id: fromBatchId } });
  if (!fromBatch) throw new Error("Batch not found");
  if (fromBatch.quantity < quantity) throw new Error("Insufficient stock in source batch");

  await tx.inventoryBatch.update({
    where: { id: fromBatch.id },
    data: { quantity: fromBatch.quantity - quantity },
  });

  const existingTarget = await tx.inventoryBatch.findFirst({
    where: {
      medicineId: fromBatch.medicineId,
      batchNo: fromBatch.batchNo,
      expiryDate: fromBatch.expiryDate,
      buyingPrice: fromBatch.buyingPrice,
      locationType: to.locationType,
      locationId: to.locationId,
    },
  });

  if (existingTarget) {
    await tx.inventoryBatch.update({
      where: { id: existingTarget.id },
      data: { quantity: existingTarget.quantity + quantity },
    });
    return fromBatch;
  }

  const toLocationTypeId = await getLookupId("INVENTORY_LOCATION_TYPE", to.locationType);
  await tx.inventoryBatch.create({
    data: {
      medicineId: fromBatch.medicineId,
      batchNo: fromBatch.batchNo,
      expiryDate: fromBatch.expiryDate,
      quantity,
      buyingPrice: fromBatch.buyingPrice,
      locationType: to.locationType,
      locationTypeId: toLocationTypeId,
      locationId: to.locationId,
    },
  });

  return fromBatch;
}

export async function assignBatchToUserSubstore(input: {
  userId: string;
  batchId: string;
  quantity: number;
  transferredById: string;
}) {
  const completedStatusId = await getLookupId("TRANSFER_STATUS", "COMPLETED");
  return prisma.$transaction(async (tx) => {
    const sourceBatch = await moveBatchQuantity(tx, input.batchId, input.quantity, {
      locationType: "NURSE",
      locationId: input.userId,
    });
    return tx.stockTransfer.create({
      data: {
        medicineId: sourceBatch.medicineId,
        batchId: sourceBatch.id,
        fromLocationId: sourceBatch.locationId ?? "MAIN_STORE",
        toLocationId: input.userId,
        quantity: input.quantity,
        status: "Completed",
        statusId: completedStatusId,
        transferredById: input.transferredById,
      },
      include: { medicine: true, batch: true, transferredBy: true, statusLookup: true },
    });
  });
}

export async function listStockMovements(params: { skip: number; take: number }) {
  const where = {};
  const [total, rows] = await prisma.$transaction([
    prisma.stockTransfer.count({ where }),
    prisma.stockTransfer.findMany({
      where,
      include: {
        medicine: true,
        batch: true,
        transferredBy: { select: { id: true, fullName: true, email: true } },
        statusLookup: true,
      },
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
  ]);
  const items = rows.map((row) => ({
    ...row,
    medicine: { ...row.medicine, genericName: decodeGenericName(row.medicine.genericName) },
  }));
  return { items, total };
}

export async function createStockMovement(input: {
  batchId: string;
  quantity: number;
  toLocationType: string;
  toLocationId?: string | null;
  bookingId?: string | null;
  transferredById: string;
}) {
  const completedStatusId = await getLookupId("TRANSFER_STATUS", "COMPLETED");
  const toLocationType = input.toLocationType.toUpperCase();
  return prisma.$transaction(async (tx) => {
    const sourceBatch = await moveBatchQuantity(tx, input.batchId, input.quantity, {
      locationType: toLocationType,
      locationId: input.toLocationId?.trim() || null,
    });
    const transfer = await tx.stockTransfer.create({
      data: {
        medicineId: sourceBatch.medicineId,
        batchId: sourceBatch.id,
        fromLocationId: sourceBatch.locationId ?? "MAIN_STORE",
        toLocationId: input.toLocationId?.trim() || toLocationType,
        quantity: input.quantity,
        status: "Completed",
        statusId: completedStatusId,
        transferredById: input.transferredById,
      },
      include: { medicine: true, batch: true, transferredBy: true, statusLookup: true },
    });

    if (toLocationType === "PATIENT" && input.bookingId?.trim()) {
      const bookingId = input.bookingId.trim();
      let visit = await tx.visitRecord.findUnique({
        where: { bookingId },
        select: { id: true },
      });
      if (!visit) {
        const booking = await tx.booking.findUnique({
          where: { id: bookingId },
          select: { patientId: true },
        });
        if (!booking) throw new Error("Booking not found");
        visit = await tx.visitRecord.create({
          data: { bookingId, patientId: booking.patientId },
          select: { id: true },
        });
      }
      await tx.dispensedMedicine.create({
        data: {
          visitId: visit.id,
          medicineId: sourceBatch.medicineId,
          batchId: sourceBatch.id,
          quantity: input.quantity,
          dispensedById: input.transferredById,
          unitPriceAtTime: sourceBatch.buyingPrice,
        },
      });
    }

    return transfer;
  });
}
