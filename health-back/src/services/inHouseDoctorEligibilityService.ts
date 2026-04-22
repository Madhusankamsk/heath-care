import prisma from "../prisma/client";

export async function listAllInHouseEligibleDoctorRows() {
  return prisma.inHouseEligibleDoctor.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          role: { select: { roleName: true } },
        },
      },
    },
  });
}

export async function upsertInHouseEligibleDoctor(userId: string, isActive: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    const err = new Error("USER_NOT_FOUND") as Error & { code?: string };
    err.code = "USER_NOT_FOUND";
    throw err;
  }
  return prisma.inHouseEligibleDoctor.upsert({
    where: { userId },
    create: { userId, isActive },
    update: { isActive },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
          role: { select: { roleName: true } },
        },
      },
    },
  });
}

export async function removeInHouseEligibleDoctor(userId: string) {
  try {
    await prisma.inHouseEligibleDoctor.delete({ where: { userId } });
  } catch {
    const err = new Error("NOT_FOUND") as Error & { code?: string };
    err.code = "NOT_FOUND";
    throw err;
  }
}

export async function assertUserIsActiveInHouseDoctor(userId: string): Promise<void> {
  const row = await prisma.inHouseEligibleDoctor.findUnique({
    where: { userId },
    select: { isActive: true },
  });
  if (row?.isActive) {
    return;
  }
  if (row && !row.isActive) {
    const err = new Error("IN_HOUSE_NOT_ELIGIBLE") as Error & { code?: string };
    err.code = "IN_HOUSE_NOT_ELIGIBLE";
    throw err;
  }

  // First-time picker fallback: auto-enroll active users.
  // Manage tab can still disable later by setting isActive=false.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isActive: true },
  });
  if (!user?.isActive) {
    const err = new Error("IN_HOUSE_NOT_ELIGIBLE") as Error & { code?: string };
    err.code = "IN_HOUSE_NOT_ELIGIBLE";
    throw err;
  }

  await prisma.inHouseEligibleDoctor.create({
    data: { userId, isActive: true },
  });
}
