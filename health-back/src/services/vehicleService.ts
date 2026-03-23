import prisma from "../prisma/client";

export async function listVehicles() {
  return prisma.vehicle.findMany({
    orderBy: { vehicleNo: "asc" },
    include: {
      currentDriver: { select: { id: true, fullName: true, email: true } },
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function getVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      currentDriver: { select: { id: true, fullName: true, email: true } },
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function createVehicle(data: {
  vehicleNo: string;
  model?: string;
  status?: string;
  statusId?: string | null;
  currentDriverId?: string | null;
}) {
  return prisma.vehicle.create({
    data: {
      vehicleNo: data.vehicleNo,
      model: data.model ?? null,
      status: data.status ?? "Available",
      statusId: data.statusId ?? null,
      currentDriverId: data.currentDriverId ?? null,
    },
    include: {
      currentDriver: { select: { id: true, fullName: true, email: true } },
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function updateVehicle(
  id: string,
  data: {
    vehicleNo?: string;
    model?: string | null;
    status?: string;
    statusId?: string | null;
    currentDriverId?: string | null;
  },
) {
  return prisma.vehicle.update({
    where: { id },
    data: {
      vehicleNo: data.vehicleNo,
      model: data.model,
      status: data.status,
      statusId: data.statusId,
      currentDriverId: data.currentDriverId,
    },
    include: {
      currentDriver: { select: { id: true, fullName: true, email: true } },
      statusLookup: { select: { id: true, lookupKey: true, lookupValue: true } },
    },
  });
}

export async function deleteVehicle(id: string) {
  return prisma.vehicle.delete({
    where: { id },
  });
}

