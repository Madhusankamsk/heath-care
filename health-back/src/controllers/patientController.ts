import type { Request, Response } from "express";

import {
  createPatient,
  deletePatient,
  getPatientById,
  listPatients,
  searchPatientsForPicker,
  updatePatient,
} from "../services/patientService";
import { okPaginated, parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

export async function searchPatientsPickerHandler(req: Request, res: Response) {
  const q = parseOptionalQueryString(req);
  if (!q) {
    return res.json({ items: [] });
  }
  const result = await searchPatientsForPicker(q);
  return res.json(result);
}

export async function listPatientsHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await listPatients({ skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function getPatientHandler(req: Request, res: Response) {
  const { id } = req.params;
  const patient = await getPatientById(id);
  if (!patient) return res.status(404).json({ message: "Patient not found" });
  return res.json(patient);
}

export async function createPatientHandler(req: Request, res: Response) {
  const {
    nicOrPassport,
    fullName,
    shortName,
    dob,
    contactNo,
    whatsappNo,
    email,
    gender,
    genderId,
    address,
    hasInsurance,
    hasGuardian,
    guardianName,
    guardianEmail,
    guardianWhatsappNo,
    guardianContactNo,
    guardianRelationship,
    billingRecipientId,
    subscriptionPlanId,
    subscriptionStatusId,
  } = req.body as Partial<{
    nicOrPassport: string | null;
    fullName: string;
    shortName: string | null;
    dob: string | null;
    contactNo: string | null;
    whatsappNo: string | null;
    email: string | null;
    gender: string | null;
    genderId: string | null;
    address: string | null;
    hasInsurance: boolean;
    hasGuardian: boolean;
    guardianName: string | null;
    guardianEmail: string | null;
    guardianWhatsappNo: string | null;
    guardianContactNo: string | null;
    guardianRelationship: string | null;
    billingRecipientId: string | null;
    subscriptionPlanId: string | null;
    subscriptionStatusId: string | null;
  }>;

  if (!fullName) {
    return res.status(400).json({ message: "fullName is required" });
  }

  try {
    const created = await createPatient({
      nicOrPassport: nicOrPassport ?? undefined,
      fullName: fullName.trim(),
      shortName: shortName ?? undefined,
      dob: dob ?? undefined,
      contactNo: contactNo ?? undefined,
      whatsappNo: whatsappNo ?? undefined,
      email: typeof email === "string" ? email.trim() || undefined : undefined,
      gender: gender ?? undefined,
      genderId: genderId ?? undefined,
      address: address ?? undefined,
      hasInsurance: Boolean(hasInsurance),
      hasGuardian: Boolean(hasGuardian),
      guardianName: guardianName ?? undefined,
      guardianEmail: guardianEmail ?? undefined,
      guardianWhatsappNo: guardianWhatsappNo ?? undefined,
      guardianContactNo: guardianContactNo ?? undefined,
      guardianRelationship: guardianRelationship ?? undefined,
      billingRecipientId: billingRecipientId ?? undefined,
      subscriptionPlanId: subscriptionPlanId ?? undefined,
      subscriptionStatusId: subscriptionStatusId ?? undefined,
      createdByUserId: req.authUser?.sub,
    });

    return res.status(201).json({ ...created.patient, invoiceId: created.invoiceId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create patient";
    if (message.startsWith("Missing lookup")) {
      return res.status(400).json({ message });
    }
    throw error;
  }
}

export async function updatePatientHandler(req: Request, res: Response) {
  const { id } = req.params;
  const {
    nicOrPassport,
    fullName,
    shortName,
    dob,
    contactNo,
    whatsappNo,
    email,
    gender,
    genderId,
    address,
    hasInsurance,
    hasGuardian,
    guardianName,
    guardianEmail,
    guardianWhatsappNo,
    guardianContactNo,
    guardianRelationship,
    billingRecipientId,
    subscriptionStatusId,
  } = req.body as Partial<{
    nicOrPassport: string | null;
    fullName: string;
    shortName: string | null;
    dob: string | null;
    contactNo: string | null;
    whatsappNo: string | null;
    email: string | null;
    gender: string | null;
    genderId: string | null;
    address: string | null;
    hasInsurance: boolean;
    hasGuardian: boolean;
    guardianName: string | null;
    guardianEmail: string | null;
    guardianWhatsappNo: string | null;
    guardianContactNo: string | null;
    guardianRelationship: string | null;
    billingRecipientId: string | null;
    subscriptionStatusId: string | null;
  }>;

  try {
    const patient = await updatePatient(id, {
      nicOrPassport: nicOrPassport ?? undefined,
      fullName: fullName ? fullName.trim() : undefined,
      shortName: shortName ?? undefined,
      dob: dob ?? undefined,
      contactNo: contactNo ?? undefined,
      whatsappNo: whatsappNo ?? undefined,
      email:
        email !== undefined
          ? typeof email === "string"
            ? email.trim() || null
            : null
          : undefined,
      gender: gender ?? undefined,
      genderId: genderId ?? undefined,
      address: address ?? undefined,
      hasInsurance: typeof hasInsurance === "boolean" ? hasInsurance : undefined,
      hasGuardian: typeof hasGuardian === "boolean" ? hasGuardian : undefined,
      guardianName: guardianName ?? undefined,
      guardianEmail: guardianEmail ?? undefined,
      guardianWhatsappNo: guardianWhatsappNo ?? undefined,
      guardianContactNo: guardianContactNo ?? undefined,
      guardianRelationship: guardianRelationship ?? undefined,
      billingRecipientId: billingRecipientId ?? undefined,
      subscriptionStatusId: subscriptionStatusId ?? undefined,
    });
    return res.json(patient);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update patient";
    return res.status(409).json({ message });
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

