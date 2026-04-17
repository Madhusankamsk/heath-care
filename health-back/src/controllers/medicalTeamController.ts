import type { Request, Response } from "express";

import {
  createMedicalTeam,
  deleteMedicalTeam,
  getMedicalTeamById,
  listMedicalTeamMemberCandidates,
  listMedicalTeams as fetchMedicalTeamsPage,
  updateMedicalTeam,
} from "../services/medicalTeamService";
import { okPaginated, parsePaginationQuery } from "../lib/pagination";

export async function listMedicalTeamsHandler(req: Request, res: Response) {
  const { page, pageSize, skip, take } = parsePaginationQuery(req);
  const { items, total } = await fetchMedicalTeamsPage({ skip, take });
  return okPaginated(res, { items, total, page, pageSize });
}

export async function getMedicalTeamHandler(req: Request, res: Response) {
  const { id } = req.params;
  const team = await getMedicalTeamById(id);
  if (!team) return res.status(404).json({ message: "Medical team not found" });
  return res.json(team);
}

export async function createMedicalTeamHandler(req: Request, res: Response) {
  const { teamName, vehicleId, memberIds, leadMemberId } = req.body as Partial<{
    teamName: string;
    vehicleId: string;
    memberIds: string[];
    leadMemberId: string | null;
  }>;

  const cleanedTeamName = teamName?.trim() ?? "";
  const cleanedVehicleId = vehicleId?.trim() ?? "";

  if (!cleanedTeamName || !cleanedVehicleId) {
    return res.status(400).json({ message: "teamName and vehicleId are required" });
  }

  const normalizedMemberIds = [...new Set((memberIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const normalizedLeadId = typeof leadMemberId === "string" ? leadMemberId.trim() : null;

  if (normalizedLeadId && !normalizedMemberIds.includes(normalizedLeadId)) {
    return res
      .status(400)
      .json({ message: "leadMemberId must be one of the selected memberIds" });
  }

  const team = await createMedicalTeam({
    teamName: cleanedTeamName,
    vehicleId: cleanedVehicleId,
    memberIds: normalizedMemberIds,
    leadMemberId: normalizedLeadId,
  });

  return res.status(201).json(team);
}

export async function updateMedicalTeamHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { teamName, vehicleId, memberIds, leadMemberId } = req.body as Partial<{
    teamName: string;
    vehicleId: string;
    memberIds: string[];
    leadMemberId: string | null;
  }>;

  const cleanedTeamName = typeof teamName === "string" ? teamName.trim() : undefined;
  const cleanedVehicleId = typeof vehicleId === "string" ? vehicleId.trim() : undefined;
  const normalizedMemberIds =
    Array.isArray(memberIds)
      ? [...new Set(memberIds.map((item) => String(item).trim()).filter(Boolean))]
      : undefined;
  const normalizedLeadId =
    leadMemberId === null
      ? null
      : typeof leadMemberId === "string"
        ? leadMemberId.trim()
        : undefined;

  if (
    normalizedLeadId &&
    normalizedMemberIds !== undefined &&
    !normalizedMemberIds.includes(normalizedLeadId)
  ) {
    return res
      .status(400)
      .json({ message: "leadMemberId must be one of the selected memberIds" });
  }

  const team = await updateMedicalTeam(id, {
    teamName: cleanedTeamName,
    vehicleId: cleanedVehicleId,
    memberIds: normalizedMemberIds,
    leadMemberId: normalizedLeadId,
  });

  return res.json(team);
}

export async function deleteMedicalTeamHandler(req: Request, res: Response) {
  const { id } = req.params;
  try {
    await deleteMedicalTeam(id);
    return res.status(204).send();
  } catch {
    return res.status(409).json({
      message: "Unable to delete medical team. Remove linked members/bookings first.",
    });
  }
}

export async function listMedicalTeamMemberCandidatesHandler(_req: Request, res: Response) {
  const members = await listMedicalTeamMemberCandidates();
  return res.json(members);
}
