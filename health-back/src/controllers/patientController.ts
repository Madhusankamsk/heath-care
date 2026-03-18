import type { Request, Response } from "express";

import {
  createPatient,
  deletePatient,
  getPatientById,
  listPatients,
  updatePatient,
} from "../services/patientService";

export async function listPatientsHandler(_req: Request, res: Response) {
  const patients = await listPatients();
  return res.json(patients);
}

export async function getPatientHandler(req: Request, res: Response) {
  const { id } = req.params;
  const patient = await getPatientById(id);
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  return res.json(patient);
}

export async function createPatientHandler(req: Request, res: Response) {
  const { nicOrPassport, fullName, dob, contactNo, gender, address } = req.body as Partial<{
    nicOrPassport: string | null;
    fullName: string;
    dob: string | null;
    contactNo: string | null;
    gender: string | null;
    address: string | null;
  }>;

  if (!fullName) {
    return res.status(400).json({ message: "fullName is required" });
  }

  const patient = await createPatient({
    nicOrPassport: nicOrPassport ?? undefined,
    fullName: fullName.trim(),
    dob: dob ?? undefined,
    contactNo: contactNo ?? undefined,
    gender: gender ?? undefined,
    address: address ?? undefined,
  });

  return res.status(201).json(patient);
}

export async function updatePatientHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { nicOrPassport, fullName, dob, contactNo, gender, address } = req.body as Partial<{
    nicOrPassport: string | null;
    fullName: string;
    dob: string | null;
    contactNo: string | null;
    gender: string | null;
    address: string | null;
  }>;

  try {
    const patient = await updatePatient(id, {
      nicOrPassport: nicOrPassport ?? undefined,
      fullName: fullName ? fullName.trim() : undefined,
      dob: dob ?? undefined,
      contactNo: contactNo ?? undefined,
      gender: gender ?? undefined,
      address: address ?? undefined,
    });
    return res.json(patient);
  } catch (error) {
    return res.status(409).json({ message: "Unable to update patient" });
  }
}

export async function deletePatientHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deletePatient(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message: "Unable to delete patient. Remove linked records first.",
    });
  }
}

