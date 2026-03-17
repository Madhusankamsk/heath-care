import { Request, Response } from "express";
import {
  createProfile,
  deactivateProfile,
  getProfileById,
  getProfiles,
  updateProfile,
} from "../services/profileService";

export async function listProfiles(_req: Request, res: Response) {
  const profiles = await getProfiles();
  res.json(profiles);
}

export async function createProfileHandler(req: Request, res: Response) {
  const { fullName, email, phoneNumber, baseConsultationFee, roleId } = req.body;
  if (!fullName || !email || !roleId) {
    return res.status(400).json({ message: "fullName, email and roleId are required" });
  }
  const profile = await createProfile({
    fullName,
    email,
    phoneNumber,
    baseConsultationFee,
    roleId,
  });
  res.status(201).json(profile);
}

export async function getProfileHandler(req: Request, res: Response) {
  const { id } = req.params;
  const profile = await getProfileById(id);
  if (!profile) {
    return res.status(404).json({ message: "Profile not found" });
  }
  res.json(profile);
}

export async function updateProfileHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { fullName, phoneNumber, baseConsultationFee, roleId, isActive } = req.body;
  const profile = await updateProfile(id, {
    fullName,
    phoneNumber,
    baseConsultationFee,
    roleId,
    isActive,
  });
  res.json(profile);
}

export async function deactivateProfileHandler(req: Request, res: Response) {
  const { id } = req.params;
  const profile = await deactivateProfile(id);
  res.json(profile);
}

