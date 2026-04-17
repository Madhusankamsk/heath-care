import { Request, Response } from "express";
import {
  createRole,
  getRoleById,
  listRoles as fetchRolesPage,
  getRolesWithPermissions,
  deleteRoleIfSafe,
  updateRole,
} from "../services/roleService";
import { okPaginated, parsePaginationQuery } from "../lib/pagination";

export async function listRoles(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const { items, total } = await fetchRolesPage({ skip, take });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function listRolesWithPermissions(_req: Request, res: Response) {
  const roles = await getRolesWithPermissions();
  res.json(roles);
}

export async function createRoleHandler(req: Request, res: Response) {
  const { roleName, description } = req.body;
  if (!roleName) {
    return res.status(400).json({ message: "roleName is required" });
  }
  const role = await createRole({ roleName, description });
  res.status(201).json(role);
}

export async function getRoleHandler(req: Request, res: Response) {
  const { id } = req.params;
  const role = await getRoleById(id);
  if (!role) {
    return res.status(404).json({ message: "Role not found" });
  }
  res.json(role);
}

export async function updateRoleHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { roleName, description } = req.body;
  const role = await updateRole(id, { roleName, description });
  res.json(role);
}

export async function deleteRoleHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const result = await deleteRoleIfSafe(id);
    if (!result || !result.deleted) {
      return res.status(404).json({ message: "Role not found" });
    }
    return res.status(204).send();
  } catch (error) {
    return res.status(409).json({
      message:
        error instanceof Error
          ? error.message
          : "Unable to delete role. Ensure it has no users and no permissions.",
    });
  }
}

