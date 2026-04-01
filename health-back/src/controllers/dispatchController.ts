import type { Request, Response } from "express";

import { loadPermissionKeys } from "../middleware/permissions";
import { resolveBookingListScope } from "../services/bookingService";
import type { DispatchStatusUpdateKey } from "../services/dispatchService";
import {
  createDispatchFromTeam,
  listDispatchMemberCandidates,
  listOngoingForDispatch,
  listUpcomingAcceptedForDispatch,
  updateDispatchStatus,
} from "../services/dispatchService";

async function getScope(req: Request) {
  const keys = await loadPermissionKeys(req);
  return resolveBookingListScope(keys);
}

export async function listUpcomingDispatchHandler(req: Request, res: Response) {
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const rows = await listUpcomingAcceptedForDispatch({ userId, scope });
  return res.json(rows);
}

export async function listOngoingDispatchHandler(req: Request, res: Response) {
  const scope = await getScope(req);
  const userId = req.authUser?.sub;
  const rows = await listOngoingForDispatch({ userId, scope });
  return res.json(rows);
}

export async function listDispatchMemberCandidatesHandler(_req: Request, res: Response) {
  const users = await listDispatchMemberCandidates();
  return res.json(users);
}

export async function createDispatchHandler(req: Request, res: Response) {
  const { bookingId, medicalTeamId, memberUserIds, vehicleId, leadUserId } = req.body as Partial<{
    bookingId: string;
    medicalTeamId: string;
    memberUserIds: unknown;
    vehicleId: string;
    leadUserId: string;
  }>;

  const b = bookingId?.trim() ?? "";
  const t = medicalTeamId?.trim() ?? "";
  const v = vehicleId?.trim() ?? "";
  const lead = leadUserId?.trim() ?? "";
  const members = Array.isArray(memberUserIds)
    ? memberUserIds.map((x) => String(x).trim()).filter(Boolean)
    : [];

  if (!b || !t) {
    return res.status(400).json({ message: "bookingId and medicalTeamId are required" });
  }
  if (!v) {
    return res.status(400).json({ message: "vehicleId is required" });
  }
  if (!lead) {
    return res.status(400).json({ message: "leadUserId is required" });
  }
  if (!members.length) {
    return res.status(400).json({
      message: "memberUserIds is required and must include at least one crew member",
    });
  }

  try {
    const scope = await getScope(req);
    const userId = req.authUser?.sub;
    const dispatch = await createDispatchFromTeam(b, t, members, v, lead, { userId, scope });
    return res.status(201).json(dispatch);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "BOOKING_NOT_FOUND") {
      return res.status(404).json({ message: "Booking not found" });
    }
    if (err.code === "BOOKING_NOT_ACCEPTED") {
      return res.status(409).json({ message: "Booking must be accepted by the doctor first" });
    }
    if (err.code === "DISPATCH_ALREADY_OPEN") {
      return res.status(409).json({ message: "A dispatch is already in progress for this booking" });
    }
    if (err.code === "DISPATCH_ALREADY_COMPLETE") {
      return res.status(409).json({ message: "Dispatch for this booking is already completed" });
    }
    if (err.code === "TEAM_NOT_FOUND") {
      return res.status(404).json({ message: "Medical team not found" });
    }
    if (err.code === "MEMBERS_REQUIRED") {
      return res.status(400).json({ message: "Select at least one crew member for this dispatch" });
    }
    if (err.code === "INVALID_DISPATCH_USER") {
      return res.status(400).json({
        message: "Each crew member must be an active staff user",
      });
    }
    if (err.code === "INVALID_VEHICLE") {
      return res.status(400).json({ message: "Invalid vehicle" });
    }
    if (err.code === "INVALID_LEAD") {
      return res.status(400).json({
        message: "Team leader must be one of the selected crew members",
      });
    }
    return res.status(500).json({ message: err.message ?? "Unable to create dispatch" });
  }
}

const DISPATCH_STATUS_KEYS: DispatchStatusUpdateKey[] = ["ARRIVED", "COMPLETED"];

export async function patchDispatchStatusHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { statusLookupKey } = req.body as Partial<{ statusLookupKey: string }>;

  if (!id?.trim()) {
    return res.status(400).json({ message: "Invalid dispatch id" });
  }

  const key = statusLookupKey?.trim() as DispatchStatusUpdateKey | undefined;
  if (!key || !DISPATCH_STATUS_KEYS.includes(key)) {
    return res.status(400).json({
      message: "statusLookupKey must be ARRIVED or COMPLETED",
    });
  }

  try {
    const scope = await getScope(req);
    const userId = req.authUser?.sub;
    const updated = await updateDispatchStatus(id.trim(), key, { userId, scope });
    return res.json(updated);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err.code === "DISPATCH_NOT_FOUND") {
      return res.status(404).json({ message: "Dispatch not found" });
    }
    if (err.code === "INVALID_TRANSITION") {
      return res.status(409).json({
        message:
          key === "ARRIVED"
            ? "Only an in-transit dispatch can be marked arrived"
            : "Only an arrived dispatch can be completed",
      });
    }
    if (err.code === "INVALID_STATUS") {
      return res.status(400).json({ message: "Invalid status" });
    }
    return res.status(500).json({ message: err.message ?? "Unable to update dispatch" });
  }
}
