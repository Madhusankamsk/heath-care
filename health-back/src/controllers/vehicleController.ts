import type { Request, Response } from "express";

import {
  createVehicle,
  deleteVehicle,
  getVehicleById,
  listVehicles as fetchVehiclesPage,
  updateVehicle,
} from "../services/vehicleService";
import { okPaginated, parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

export async function listVehiclesHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await fetchVehiclesPage({ skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function getVehicleHandler(req: Request, res: Response) {
  const { id } = req.params;
  const vehicle = await getVehicleById(id);
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
  return res.json(vehicle);
}

export async function createVehicleHandler(req: Request, res: Response) {
  const { vehicleNo, model, status, statusId, currentDriverId } = req.body as Partial<{
    vehicleNo: string;
    model: string;
    status: string;
    statusId: string | null;
    currentDriverId: string | null;
  }>;

  const cleanedVehicleNo = vehicleNo?.trim() ?? "";
  if (!cleanedVehicleNo) {
    return res.status(400).json({ message: "vehicleNo is required" });
  }

  const vehicle = await createVehicle({
    vehicleNo: cleanedVehicleNo,
    model: model?.trim() ? model.trim() : undefined,
    status: status?.trim() ? status.trim() : undefined,
    statusId: typeof statusId === "string" ? statusId.trim() || null : null,
    currentDriverId:
      typeof currentDriverId === "string" ? currentDriverId.trim() || null : null,
  });

  return res.status(201).json(vehicle);
}

export async function updateVehicleHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { vehicleNo, model, status, statusId, currentDriverId } = req.body as Partial<{
    vehicleNo: string;
    model: string | null;
    status: string;
    statusId: string | null;
    currentDriverId: string | null;
  }>;

  const cleanedVehicleNo = typeof vehicleNo === "string" ? vehicleNo.trim() : undefined;
  const cleanedModel =
    model === null ? null : typeof model === "string" ? model.trim() : undefined;
  const cleanedStatus = typeof status === "string" ? status.trim() : undefined;
  const cleanedStatusId =
    statusId === null ? null : typeof statusId === "string" ? statusId.trim() || null : undefined;
  const cleanedCurrentDriverId =
    currentDriverId === null
      ? null
      : typeof currentDriverId === "string"
        ? currentDriverId.trim() || null
        : undefined;

  const vehicle = await updateVehicle(id, {
    vehicleNo: cleanedVehicleNo ? cleanedVehicleNo : undefined,
    model: cleanedModel,
    status: cleanedStatus,
    statusId: cleanedStatusId,
    currentDriverId: cleanedCurrentDriverId,
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

