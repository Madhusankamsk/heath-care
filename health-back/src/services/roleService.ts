import prisma from "../prisma/client";

import { roleTextSearchWhere } from "../lib/searchWhere";

export async function createRole(data: { roleName: string; description?: string }) {
  return prisma.role.create({ data });
}

export async function listRoles(params: { skip: number; take: number; q?: string }) {
  const where = params.q?.trim() ? roleTextSearchWhere(params.q) : {};
  const [total, items] = await prisma.$transaction([
    prisma.role.count({ where }),
    prisma.role.findMany({
      where,
      orderBy: { roleName: "asc" },
      skip: params.skip,
      take: params.take,
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        users: {
          select: { id: true },
        },
      },
    }),
  ]);
  return { items, total };
}

export async function getRolesWithPermissions() {
  return prisma.role.findMany({
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      users: {
        select: { id: true },
      },
    },
  });
}

export async function getRoleById(id: string) {
  return prisma.role.findUnique({ where: { id } });
}

export async function updateRole(id: string, data: { roleName?: string; description?: string }) {
  return prisma.role.update({ where: { id }, data });
}

export async function deleteRole(id: string) {
  return prisma.role.delete({ where: { id } });
}

export async function deleteRoleIfSafe(id: string) {
  const role = await prisma.role.findUnique({
    where: { id },
    include: {
      users: { select: { id: true } },
      permissions: true, // RolePermission rows
    },
  });

  if (!role) return { deleted: false };

  if (role.users.length > 0) {
    throw new Error("Unable to delete role: users are assigned to this role.");
  }

  if (role.permissions.length > 0) {
    throw new Error("Unable to delete role: permissions are still attached to this role.");
  }

  await prisma.role.delete({ where: { id } });
  return { deleted: true };
}

