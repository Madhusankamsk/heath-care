import prisma from "../prisma/client";
import bcrypt from "bcryptjs";

export async function createProfile(data: {
  fullName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  baseConsultationFee?: number;
  roleId: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      password: passwordHash,
      phoneNumber: data.phoneNumber,
      baseConsultationFee: data.baseConsultationFee ?? 0,
      roleId: data.roleId,
    },
    include: { role: true },
  });
}

export async function listProfiles(params: { skip: number; take: number }) {
  const where = {};
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: { fullName: "asc" },
      include: { role: true },
    }),
  ]);
  return { items, total };
}

export async function getProfileById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
}

export async function updateProfile(
  id: string,
  data: {
    fullName?: string;
    phoneNumber?: string;
    baseConsultationFee?: number;
    roleId?: string;
    isActive?: boolean;
  },
) {
  return prisma.user.update({
    where: { id },
    data,
    include: { role: true },
  });
}

export async function deactivateProfile(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    include: { role: true },
  });
}

export async function deleteProfile(id: string) {
  return prisma.user.delete({
    where: { id },
  });
}

