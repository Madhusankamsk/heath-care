import type { Request, Response } from "express";

import {
  assignBatchToUserSubstore,
  createBatch,
  createMedicine,
  createStockMovement,
  deleteBatch,
  deleteMedicine,
  getMedicine,
  listBatches,
  listMedicines,
  listMobileSubstoresPaginated,
  listStockMovements,
  updateBatch,
  updateMedicine,
} from "../services/inventoryService";
import { okPaginated, parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

function parseNumber(value: unknown, field: string) {
  const n = Number(value);
  if (Number.isNaN(n)) throw new Error(`${field} must be a number`);
  return n;
}

function parseIntNumber(value: unknown, field: string) {
  const n = parseNumber(value, field);
  if (!Number.isInteger(n)) throw new Error(`${field} must be an integer`);
  return n;
}

function asKind(path: string) {
  return path.includes("medical-items") ? "item" : "medicine";
}

export async function listInventoryMedicinesHandler(req: Request, res: Response) {
  const kind = asKind(req.path);
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listMedicines(kind, { skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function createInventoryMedicineHandler(req: Request, res: Response) {
  try {
    const kind = asKind(req.path);
    const body = req.body as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });
    const created = await createMedicine(kind, {
      name,
      genericName: body.genericName ? String(body.genericName) : null,
      sellingPrice: parseNumber(body.sellingPrice, "sellingPrice"),
      uom: body.uom ? String(body.uom) : null,
      uomId: body.uomId ? String(body.uomId) : null,
      minStockLevel: body.minStockLevel != null ? parseIntNumber(body.minStockLevel, "minStockLevel") : null,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Create failed" });
  }
}

export async function getInventoryMedicineHandler(req: Request, res: Response) {
  const kind = asKind(req.path);
  const row = await getMedicine(kind, req.params.id);
  if (!row) return res.status(404).json({ message: "Not found" });
  return res.json(row);
}

export async function updateInventoryMedicineHandler(req: Request, res: Response) {
  try {
    const kind = asKind(req.path);
    const body = req.body as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });
    const updated = await updateMedicine(kind, req.params.id, {
      name,
      genericName: body.genericName ? String(body.genericName) : null,
      sellingPrice: parseNumber(body.sellingPrice, "sellingPrice"),
      uom: body.uom ? String(body.uom) : null,
      uomId: body.uomId ? String(body.uomId) : null,
      minStockLevel: body.minStockLevel != null ? parseIntNumber(body.minStockLevel, "minStockLevel") : null,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Update failed" });
  }
}

export async function deleteInventoryMedicineHandler(req: Request, res: Response) {
  const kind = asKind(req.path);
  const deleted = await deleteMedicine(kind, req.params.id);
  if (!deleted) return res.status(404).json({ message: "Not found" });
  return res.status(204).send();
}

export async function listInventoryBatchesHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listBatches({ skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function createInventoryBatchHandler(req: Request, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const created = await createBatch({
      medicineId: String(body.medicineId ?? "").trim(),
      batchNo: String(body.batchNo ?? "").trim(),
      expiryDate: String(body.expiryDate ?? ""),
      quantity: parseIntNumber(body.quantity, "quantity"),
      buyingPrice: parseNumber(body.buyingPrice, "buyingPrice"),
      locationType: body.locationType ? String(body.locationType) : "WAREHOUSE",
      locationId: body.locationId ? String(body.locationId) : null,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Create batch failed" });
  }
}

export async function updateInventoryBatchHandler(req: Request, res: Response) {
  try {
    const body = req.body as Record<string, unknown>;
    const updated = await updateBatch(req.params.id, {
      batchNo: String(body.batchNo ?? "").trim(),
      expiryDate: String(body.expiryDate ?? ""),
      quantity: parseIntNumber(body.quantity, "quantity"),
      buyingPrice: parseNumber(body.buyingPrice, "buyingPrice"),
      locationType: body.locationType ? String(body.locationType) : "WAREHOUSE",
      locationId: body.locationId ? String(body.locationId) : null,
    });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Update batch failed" });
  }
}

export async function deleteInventoryBatchHandler(req: Request, res: Response) {
  await deleteBatch(req.params.id);
  return res.status(204).send();
}

export async function listMobileSubstoresHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listMobileSubstoresPaginated({ skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function assignMobileSubstoreHandler(req: Request, res: Response) {
  try {
    const userId = req.authUser?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const body = req.body as Record<string, unknown>;
    const row = await assignBatchToUserSubstore({
      userId: String(body.userId ?? "").trim(),
      batchId: String(body.batchId ?? "").trim(),
      quantity: parseIntNumber(body.quantity, "quantity"),
      transferredById: userId,
    });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Assign failed" });
  }
}

export async function listStockMovementsHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listStockMovements({ skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function createStockMovementHandler(req: Request, res: Response) {
  try {
    const userId = req.authUser?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const body = req.body as Record<string, unknown>;
    const row = await createStockMovement({
      batchId: String(body.batchId ?? "").trim(),
      quantity: parseIntNumber(body.quantity, "quantity"),
      toLocationType: String(body.toLocationType ?? "WAREHOUSE"),
      toLocationId: body.toLocationId ? String(body.toLocationId) : null,
      bookingId: body.bookingId ? String(body.bookingId).trim() : null,
      transferredById: userId,
    });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : "Transfer failed" });
  }
}
