import prisma from "../prisma/client";

export type PatientCreateInput = {
  nicOrPassport?: string | null;
  fullName: string;
  dob?: string | Date | null;
  contactNo?: string | null;
  gender?: string | null;
  address?: string | null;
};

export async function listPatients() {
  return prisma.patient.findMany({
    orderBy: { fullName: "asc" },
  });
}

export async function getPatientById(id: string) {
  return prisma.patient.findUnique({ where: { id } });
}

export async function createPatient(data: PatientCreateInput) {
  const dobValue =
    data.dob === null || data.dob === undefined || data.dob === ""
      ? undefined
      : typeof data.dob === "string"
        ? new Date(data.dob)
        : data.dob;

  return prisma.patient.create({
    data: {
      fullName: data.fullName,
      nicOrPassport: data.nicOrPassport ?? undefined,
      dob: dobValue ?? undefined,
      contactNo: data.contactNo ?? undefined,
      gender: data.gender ?? undefined,
      address: data.address ?? undefined,
    },
  });
}

export async function updatePatient(
  id: string,
  data: Omit<PatientCreateInput, "fullName"> & { fullName?: string },
) {
  const dobValue =
    data.dob === null || data.dob === undefined || data.dob === ""
      ? undefined
      : typeof data.dob === "string"
        ? new Date(data.dob)
        : data.dob;

  return prisma.patient.update({
    where: { id },
    data: {
      fullName: data.fullName,
      nicOrPassport: data.nicOrPassport ?? undefined,
      dob: dobValue ?? undefined,
      contactNo: data.contactNo ?? undefined,
      gender: data.gender ?? undefined,
      address: data.address ?? undefined,
    },
  });
}

export async function deletePatient(id: string) {
  return prisma.patient.delete({
    where: { id },
  });
}

