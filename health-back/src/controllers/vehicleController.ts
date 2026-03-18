import type { Request, Response } from "express";

import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listVehicles,
  updateVehicle,
} from "../services/vehicleService";

export async function listVehiclesHandler(_req: Request, res: Response) {
  const vehicles = await listVehicles();
  return res.json(vehicles);
}

export async function getVehicleHandler(req: Request, res: Response) {
  const { id } = req.params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
  return res.json(vehicle);
}

export async function createVehicleHandler(req: Request, res: Response) {
  const { vehicleNo, model, status } = req.body as Partial<{
    vehicleNo: string;
    model: string;
    status: string;
  }>;

  const cleanedVehicleNo = vehicleNo?.trim() ?? "";
  if (!cleanedVehicleNo) {
    return res.status(400).json({ message: "vehicleNo is required" });
  }

  const vehicle = await createVehicle({
    vehicleNo: cleanedVehicleNo,
    model: model?.trim() ? model.trim() : undefined,
    status: status?.trim() ? status.trim() : undefined,
  });

  return res.status(201).json(vehicle);
}

export async function updateVehicleHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { vehicleNo, model, status } = req.body as Partial<{
    vehicleNo: string;
    model: string | null;
    status: string;
  }>;

  const cleanedVehicleNo = typeof vehicleNo === "string" ? vehicleNo.trim() : undefined;
  const cleanedModel =
    model === null ? null : typeof model === "string" ? model.trim() : undefined;
  const cleanedStatus = typeof status === "string" ? status.trim() : undefined;

  const vehicle = await updateVehicle(id, {
    vehicleNo: cleanedVehicleNo ? cleanedVehicleNo : undefined,
    model: cleanedModel,
    status: cleanedStatus,
  });

  return res.json(vehicle);
}

export async function deleteVehicleHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteVehicle(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message: "Unable to delete vehicle. Remove linked teams first.",
    });
  }
}

