import prisma from "../prisma/client";

export async function createProfile(data: {
  fullName: string;
  email: string;
  phoneNumber?: string;
  baseConsultationFee?: number;
  roleId: string;
}) {
  return prisma.profile.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      baseConsultationFee: data.baseConsultationFee ?? 0,
      roleId: data.roleId,
    },
  });
}

export async function getProfiles() {
  return prisma.profile.findMany({
    include: { role: true },
  });
}

export async function getProfileById(id: string) {
  return prisma.profile.findUnique({
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
  return prisma.profile.update({
    where: { id },
    data,
  });
}

export async function deactivateProfile(id: string) {
  return prisma.profile.update({
    where: { id },
    data: { isActive: false },
  });
}

