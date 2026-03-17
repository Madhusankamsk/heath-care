import prisma from "../prisma/client";

export async function createRole(data: { roleName: string; description?: string }) {
  return prisma.role.create({ data });
}

export async function getRoles() {
  return prisma.role.findMany();
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

