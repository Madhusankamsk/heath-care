import type { Request, Response } from "express";

import {
  AddSubscriptionMemberError,
  addSubscriptionMember,
  detachSubscriptionMember,
  DetachSubscriptionMemberError,
  createSubscriptionAccount,
  deleteSubscriptionAccount,
  getSubscriptionAccountById,
  listSubscriptionAccounts as fetchSubscriptionAccountsPage,
  updateSubscriptionAccount,
} from "../services/subscriptionAccountService";
import { okPaginated, parseOptionalQueryString, parsePaginationQuery } from "../lib/pagination";

export async function listSubscriptionAccountsHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const q = parseOptionalQueryString(req);
  const { items, total } = await fetchSubscriptionAccountsPage({ skip, take, q });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function getSubscriptionAccountHandler(req: Request, res: Response) {
  const { id } = req.params;
  const row = await getSubscriptionAccountById(id);
  if (!row) return res.status(404).json({ message: "Subscription account not found" });
  return res.json(row);
}

export async function createSubscriptionAccountHandler(req: Request, res: Response) {
  // primaryPatientId: optional; if set, that patient is added as a member only (invoice is corporate, no patient on invoice).
  const {
    accountName,
    planId,
    startDate,
    endDate,
    statusId,
    registrationNo,
    billingAddress,
    contactEmail,
    contactPhone,
    whatsappNo,
    primaryPatientId,
  } = req.body as Partial<{
    accountName: string | null;
    planId: string;
    startDate: string | null;
    endDate: string | null;
    statusId: string | null;
    registrationNo: string | null;
    billingAddress: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    whatsappNo: string | null;
    primaryPatientId: string | null;
  }>;

  const cleanedPlanId = planId?.trim() ?? "";

  if (!cleanedPlanId) {
    return res.status(400).json({
      message: "planId is required",
    });
  }

  try {
    const created = await createSubscriptionAccount({
      accountName: accountName?.trim() || undefined,
      planId: cleanedPlanId,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      statusId: statusId?.trim() || undefined,
      registrationNo: registrationNo?.trim() || undefined,
      billingAddress: billingAddress?.trim() || undefined,
      contactEmail: contactEmail?.trim() || undefined,
      contactPhone: contactPhone?.trim() || undefined,
      whatsappNo: whatsappNo?.trim() || undefined,
      primaryPatientId: primaryPatientId?.trim() || undefined,
    });

    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create subscription account";
    if (message === "Invalid subscription account status") {
      return res.status(400).json({ message });
    }
    if (message === "Primary patient not found") {
      return res.status(400).json({ message });
    }
    if (message.startsWith("Missing lookup")) {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Unable to create subscription account" });
  }
}

export async function updateSubscriptionAccountHandler(req: Request, res: Response) {
  const { id } = req.params;
  const {
    accountName,
    planId,
    startDate,
    endDate,
    statusId,
    registrationNo,
    billingAddress,
    contactEmail,
    contactPhone,
    whatsappNo,
  } = req.body as Partial<{
    accountName: string | null;
    planId: string;
    startDate: string | null;
    endDate: string | null;
    statusId: string | null;
    registrationNo: string | null;
    billingAddress: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    whatsappNo: string | null;
  }>;

  try {
    const updated = await updateSubscriptionAccount(id, {
      accountName: typeof accountName === "string" ? accountName.trim() : undefined,
      planId: typeof planId === "string" ? planId.trim() : undefined,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
      statusId: typeof statusId === "string" ? statusId.trim() : undefined,
      registrationNo: typeof registrationNo === "string" ? registrationNo.trim() : undefined,
      billingAddress: typeof billingAddress === "string" ? billingAddress.trim() : undefined,
      contactEmail: typeof contactEmail === "string" ? contactEmail.trim() : undefined,
      contactPhone: typeof contactPhone === "string" ? contactPhone.trim() : undefined,
      whatsappNo: typeof whatsappNo === "string" ? whatsappNo.trim() : undefined,
    });

    return res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update subscription account";
    if (message === "Invalid subscription account status") {
      return res.status(400).json({ message });
    }
    return res.status(500).json({ message: "Unable to update subscription account" });
  }
}

export async function deleteSubscriptionAccountHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteSubscriptionAccount(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message: "Unable to delete subscription account. Remove linked records first.",
    });
  }
}

export async function addSubscriptionMemberHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { nicOrPassport, patient } = req.body as Partial<{
    nicOrPassport: string;
    patient: {
      fullName: string;
      shortName?: string | null;
      dob?: string | null;
      contactNo?: string | null;
      whatsappNo?: string | null;
      genderId?: string | null;
      address?: string | null;
      hasInsurance?: boolean;
      hasGuardian?: boolean;
      guardianName?: string | null;
      guardianEmail?: string | null;
      guardianWhatsappNo?: string | null;
      guardianContactNo?: string | null;
      guardianRelationship?: string | null;
      billingRecipientId?: string | null;
    };
  }>;

  const cleanedNic = nicOrPassport?.trim() ?? "";
  if (!cleanedNic) {
    return res.status(400).json({ message: "nicOrPassport is required" });
  }

  try {
    const created = await addSubscriptionMember(id, {
      nicOrPassport: cleanedNic,
      patient,
    });
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof AddSubscriptionMemberError) {
      if (error.code === "ACCOUNT_NOT_FOUND") return res.status(404).json({ message: error.message });
      if (error.code === "MAX_MEMBERS_REACHED") return res.status(409).json({ message: error.message });
      if (error.code === "ALREADY_MEMBER") return res.status(409).json({ message: error.message });
      if (error.code === "PATIENT_DETAILS_REQUIRED") {
        return res.status(400).json({ message: error.message });
      }
    }
    return res.status(500).json({ message: "Unable to add subscription member" });
  }
}

export async function detachSubscriptionMemberHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { patientId } = req.body as Partial<{ patientId: string }>;

  if (!patientId) {
    return res.status(400).json({ message: "patientId is required" });
  }

  try {
    await detachSubscriptionMember(id, patientId);
    return res.status(204).send();
  } catch (error) {
    if (error instanceof DetachSubscriptionMemberError) {
      if (error.code === "ACCOUNT_NOT_FOUND") return res.status(404).json({ message: error.message });
      if (error.code === "MEMBER_NOT_FOUND") return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: "Unable to detach subscription member" });
  }
}

