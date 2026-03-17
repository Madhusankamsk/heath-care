import { Request, Response } from "express";
import { createRole, deleteRole, getRoleById, getRoles, updateRole } from "../services/roleService";

export async function listRoles(_req: Request, res: Response) {
  const roles = await getRoles();
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
  await deleteRole(id);
  res.status(204).send();
}

