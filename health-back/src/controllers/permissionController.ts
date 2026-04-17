import { Request, Response } from "express";
import {
  attachPermissionToRole,
  createPermission,
  deletePermission,
  detachPermissionFromRole,
  listPermissions as fetchPermissionsPage,
} from "../services/permissionService";
import { okPaginated, parsePaginationQuery } from "../lib/pagination";

export async function listPermissions(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const { items, total } = await fetchPermissionsPage({ skip, take });
  return okPaginated(res, { items, total, page, pageSize });
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

export async function deletePermissionHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deletePermission(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message:
        "Unable to delete permission. Detach it from all roles before deleting.",
    });
  }
}

