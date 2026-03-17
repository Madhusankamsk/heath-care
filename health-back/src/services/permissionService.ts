import prisma from "../prisma/client";

export async function createPermission(data: { permissionKey: string }) {
  return prisma.permission.create({ data });
}

export async function getPermissions() {
  return prisma.permission.findMany();
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

