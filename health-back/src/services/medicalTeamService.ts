import prisma from "../prisma/client";

type MedicalTeamPayload = {
  teamName: string;
  vehicleId: string;
  memberIds?: string[];
  leadMemberId?: string | null;
};

function normalizeMemberIds(memberIds: string[] | undefined) {
  const cleaned = (memberIds ?? []).map((id) => id.trim()).filter(Boolean);
  return [...new Set(cleaned)];
}

export async function listMedicalTeams() {
  return prisma.medicalTeam.findMany({
    orderBy: [{ teamName: "asc" }, { id: "asc" }],
    include: {
      vehicle: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isActive: true,
              role: { select: { id: true, roleName: true } },
            },
          },
        },
      },
      _count: { select: { members: true, bookings: true } },
    },
  });
}

export async function getMedicalTeamById(id: string) {
  return prisma.medicalTeam.findUnique({
    where: { id },
    include: {
      vehicle: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              isActive: true,
              role: { select: { id: true, roleName: true } },
            },
          },
        },
      },
      _count: { select: { members: true, bookings: true } },
    },
  });
}

export async function createMedicalTeam(data: MedicalTeamPayload) {
  return prisma.$transaction(async (tx) => {
    const team = await tx.medicalTeam.create({
      data: {
        teamName: data.teamName,
        vehicleId: data.vehicleId,
      },
    });

    const normalizedMemberIds = normalizeMemberIds(data.memberIds);
    const normalizedLeadId = data.leadMemberId?.trim() || null;

    if (normalizedMemberIds.length) {
      await tx.teamMember.createMany({
        data: normalizedMemberIds.map((userId) => ({
          teamId: team.id,
          userId,
          isLead: normalizedLeadId === userId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.medicalTeam.findUniqueOrThrow({
      where: { id: team.id },
      include: {
        vehicle: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                isActive: true,
                role: { select: { id: true, roleName: true } },
              },
            },
          },
        },
        _count: { select: { members: true, bookings: true } },
      },
    });
  });
}

export async function updateMedicalTeam(
  id: string,
  data: { teamName?: string; vehicleId?: string; memberIds?: string[]; leadMemberId?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    await tx.medicalTeam.update({
      where: { id },
      data: {
        teamName: data.teamName,
        vehicleId: data.vehicleId,
      },
    });

    if (data.memberIds) {
      const normalizedMemberIds = normalizeMemberIds(data.memberIds);
      const normalizedLeadId = data.leadMemberId?.trim() || null;

      await tx.teamMember.deleteMany({
        where: {
          teamId: id,
          userId: { notIn: normalizedMemberIds.length ? normalizedMemberIds : ["__none__"] },
        },
      });

      if (normalizedMemberIds.length) {
        await tx.teamMember.createMany({
          data: normalizedMemberIds.map((userId) => ({
            teamId: id,
            userId,
            isLead: normalizedLeadId === userId,
          })),
          skipDuplicates: true,
        });
      }

      await tx.teamMember.updateMany({
        where: { teamId: id },
        data: { isLead: false },
      });

      if (normalizedLeadId) {
        await tx.teamMember.updateMany({
          where: { teamId: id, userId: normalizedLeadId },
          data: { isLead: true },
        });
      }
    }

    return tx.medicalTeam.findUniqueOrThrow({
      where: { id },
      include: {
        vehicle: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                isActive: true,
                role: { select: { id: true, roleName: true } },
              },
            },
          },
        },
        _count: { select: { members: true, bookings: true } },
      },
    });
  });
}

export async function deleteMedicalTeam(id: string) {
  return prisma.medicalTeam.delete({
    where: { id },
  });
}

export async function listMedicalTeamMemberCandidates() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: { select: { id: true, roleName: true } },
    },
  });
}
