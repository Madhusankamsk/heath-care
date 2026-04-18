import prisma from "../prisma/client";

import { permissionKeySearchWhere } from "../lib/searchWhere";

export async function createPermission(data: { permissionKey: string }) {
  return prisma.permission.create({ data });
}

export async function listPermissions(params: { skip: number; take: number; q?: string }) {
  const where = params.q?.trim() ? permissionKeySearchWhere(params.q) : {};
  const [total, items] = await prisma.$transaction([
    prisma.permission.count({ where }),
    prisma.permission.findMany({
      where,
      orderBy: { permissionKey: "asc" },
      skip: params.skip,
      take: params.take,
    }),
  ]);
  return { items, total };
}

export async function attachPermissionToRole(roleId: string, permissionId: string) {
  return prisma.rolePermission.create({
    data: { roleId, permissionId },
  });
}

export async function detachPermissionFromRole(roleId: string, permissionId: string) {
  return prisma.rolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
}

export async function deletePermission(permissionId: string) {
  return prisma.permission.delete({
    where: { id: permissionId },
  });
}

