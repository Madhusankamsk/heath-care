import prisma from "../prisma/client";

export async function listVehicles() {
  return prisma.vehicle.findMany({
    orderBy: { vehicleNo: "asc" },
  });
}

export async function getVehicleById(id: string) {
  return prisma.vehicle.findUnique({
    where: { id },
  });
}

export async function createVehicle(data: {
  vehicleNo: string;
  model?: string;
  status?: string;
}) {
  return prisma.vehicle.create({
    data: {
      vehicleNo: data.vehicleNo,
      model: data.model ?? null,
      status: data.status ?? "Available",
    },
  });
}

export async function updateVehicle(
  id: string,
  data: {
    vehicleNo?: string;
    model?: string | null;
    status?: string;
  },
) {
  return prisma.vehicle.update({
    where: { id },
    data: {
      vehicleNo: data.vehicleNo,
      model: data.model,
      status: data.status,
    },
  });
}

export async function deleteVehicle(id: string) {
  return prisma.vehicle.delete({
    where: { id },
  });
}

