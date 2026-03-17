import { Request, Response } from "express";
import {
  attachPermissionToRole,
  createPermission,
  detachPermissionFromRole,
  getPermissions,
} from "../services/permissionService";

export async function listPermissions(_req: Request, res: Response) {
  const permissions = await getPermissions();
  res.json(permissions);
}

export async function createPermissionHandler(req: Request, res: Response) {
  const { permissionKey } = req.body;
  if (!permissionKey) {
    return res.status(400).json({ message: "permissionKey is required" });
  }
  const permission = await createPermission({ permissionKey });
  res.status(201).json(permission);
}

export async function attachPermissionHandler(req: Request, res: Response) {
  const { roleId, permissionId } = req.body;
  if (!roleId || !permissionId) {
    return res.status(400).json({ message: "roleId and permissionId are required" });
  }
  const mapping = await attachPermissionToRole(roleId, permissionId);
  res.status(201).json(mapping);
}

export async function detachPermissionHandler(req: Request, res: Response) {
  const { roleId, permissionId } = req.body;
  if (!roleId || !permissionId) {
    return res.status(400).json({ message: "roleId and permissionId are required" });
  }
  await detachPermissionFromRole(roleId, permissionId);
  res.status(204).send();
}

