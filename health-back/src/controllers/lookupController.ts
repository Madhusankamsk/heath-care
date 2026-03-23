import type { Request, Response } from "express";
import { listLookupsByCategory } from "../services/lookupService";

export async function listLookupsHandler(req: Request, res: Response) {
  const category = String(req.query.category ?? "").trim();
  if (!category) {
    return res.status(400).json({ message: "category is required" });
  }

  const values = await listLookupsByCategory(category);
  return res.json(values);
}

