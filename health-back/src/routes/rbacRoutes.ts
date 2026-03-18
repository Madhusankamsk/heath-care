import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireSuperAdmin } from "../middleware/superAdmin";
import {
  attachPermissionHandler,
  createPermissionHandler,
  detachPermissionHandler,
  listPermissions,
} from "../controllers/permissionController";
import {
  createRoleHandler,
  deleteRoleHandler,
  getRoleHandler,
  listRoles,
  updateRoleHandler,
} from "../controllers/roleController";
import {
  createProfileHandler,
  deactivateProfileHandler,
  deleteProfileHandler,
  getProfileHandler,
  listProfiles,
  updateProfileHandler,
} from "../controllers/profileController";
import {
  createVehicleHandler,
  deleteVehicleHandler,
  getVehicleHandler,
  listVehiclesHandler,
  updateVehicleHandler,
} from "../controllers/vehicleController";
import { requireAnyPermission } from "../middleware/permissions";
import prisma from "../prisma/client";

const router = Router();

// Protect RBAC routes with auth middleware
router.use(requireAuth);

// Current user + permissions (for frontend privilege checks)
router.get("/me", async (req, res) => {
  const userId = req.authUser?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const permissionKeys =
    user.role?.permissions?.map((rp) => rp.permission.permissionKey) ?? [];

  return res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role?.roleName ?? null,
      isActive: user.isActive,
    },
    permissions: permissionKeys,
  });
});

// Company settings (white-label). Any authenticated user can read.
// Updating remains super-admin-only (see PUT below).
router.get("/company-settings", async (_req, res) => {
  const settings = await prisma.companySettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  return res.json(settings);
});

router.put("/company-settings", requireSuperAdmin, async (req, res) => {
  const body = req.body as Partial<{
    companyName: string;
    companyEmail: string | null;
    companyPhone: string | null;
    companyAddress: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    currencyCode: string | null;
    travelCostPerKm: number | string | null;
    taxPercentage: number | string | null;
    invoicePrefix: string | null;
    isSetupCompleted: boolean | null;
  }>;

  const companyName = body.companyName?.trim() ?? "";
  if (!companyName) {
    return res.status(400).json({ message: "companyName is required" });
  }

  const toDecimal = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return undefined;
    const n = typeof value === "string" ? Number(value) : value;
    if (Number.isNaN(n)) return undefined;
    return n;
  };

  const existing = await prisma.companySettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const data = {
    companyName,
    companyEmail: body.companyEmail ?? undefined,
    companyPhone: body.companyPhone ?? undefined,
    companyAddress: body.companyAddress ?? undefined,
    logoUrl: body.logoUrl ?? undefined,
    primaryColor: body.primaryColor ?? undefined,
    secondaryColor: body.secondaryColor ?? undefined,
    currencyCode: body.currencyCode ?? undefined,
    travelCostPerKm: toDecimal(body.travelCostPerKm),
    taxPercentage: toDecimal(body.taxPercentage),
    invoicePrefix: body.invoicePrefix ?? undefined,
    isSetupCompleted:
      typeof body.isSetupCompleted === "boolean" ? body.isSetupCompleted : undefined,
    updatedAt: new Date(),
  };

  const saved = existing
    ? await prisma.companySettings.update({ where: { id: existing.id }, data })
    : await prisma.companySettings.create({ data });

  return res.json(saved);
});

// Roles
router.get("/roles", listRoles);
router.post("/roles", createRoleHandler);
router.get("/roles/:id", getRoleHandler);
router.put("/roles/:id", updateRoleHandler);
router.delete("/roles/:id", deleteRoleHandler);

// Permissions
router.get("/permissions", listPermissions);
router.post("/permissions", createPermissionHandler);
router.post("/permissions/attach", attachPermissionHandler);
router.post("/permissions/detach", detachPermissionHandler);

// Profiles
router.get("/profiles", requireAnyPermission(["profiles:list"]), listProfiles);
router.post("/profiles", requireAnyPermission(["profiles:create"]), createProfileHandler);
router.get("/profiles/:id", requireAnyPermission(["profiles:read"]), getProfileHandler);
router.put("/profiles/:id", requireAnyPermission(["profiles:update"]), updateProfileHandler);
router.post(
  "/profiles/:id/deactivate",
  requireAnyPermission(["profiles:deactivate"]),
  deactivateProfileHandler,
);
router.delete("/profiles/:id", requireAnyPermission(["profiles:delete"]), deleteProfileHandler);

// Vehicles
router.get("/vehicles", requireAnyPermission(["vehicles:list"]), listVehiclesHandler);
router.post("/vehicles", requireAnyPermission(["vehicles:create"]), createVehicleHandler);
router.get("/vehicles/:id", requireAnyPermission(["vehicles:read"]), getVehicleHandler);
router.put("/vehicles/:id", requireAnyPermission(["vehicles:update"]), updateVehicleHandler);
router.delete("/vehicles/:id", requireAnyPermission(["vehicles:delete"]), deleteVehicleHandler);

export default router;

