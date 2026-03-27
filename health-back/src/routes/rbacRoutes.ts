import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireSuperAdmin } from "../middleware/superAdmin";
import {
  attachPermissionHandler,
  createPermissionHandler,
  deletePermissionHandler,
  detachPermissionHandler,
  listPermissions,
} from "../controllers/permissionController";
import {
  createRoleHandler,
  deleteRoleHandler,
  getRoleHandler,
  listRoles,
  listRolesWithPermissions,
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
import {
  createMedicalTeamHandler,
  deleteMedicalTeamHandler,
  getMedicalTeamHandler,
  listMedicalTeamMemberCandidatesHandler,
  listMedicalTeamsHandler,
  updateMedicalTeamHandler,
} from "../controllers/medicalTeamController";
import {
  createPatientHandler,
  deletePatientHandler,
  getPatientHandler,
  listPatientsHandler,
  updatePatientHandler,
} from "../controllers/patientController";
import { listLookupsHandler } from "../controllers/lookupController";
import {
  createBookingHandler,
  deleteBookingHandler,
  getBookingHandler,
  listBookingsHandler,
  updateBookingHandler,
} from "../controllers/bookingController";
import {
  createSubscriptionPlanHandler,
  deleteSubscriptionPlanHandler,
  getSubscriptionPlanHandler,
  listSubscriptionPlansHandler,
  listSubscriptionPlanTypesHandler,
  updateSubscriptionPlanHandler,
} from "../controllers/subscriptionPlanController";
import {
  addSubscriptionMemberHandler,
  detachSubscriptionMemberHandler,
  createSubscriptionAccountHandler,
  deleteSubscriptionAccountHandler,
  getSubscriptionAccountHandler,
  listSubscriptionAccountsHandler,
  updateSubscriptionAccountHandler,
} from "../controllers/subscriptionAccountController";
import { getInvoicePdfHandler } from "../controllers/invoiceController";
import { listPaymentsHandler } from "../controllers/paymentController";
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
router.get("/roles-with-permissions", listRolesWithPermissions);
router.post("/roles", createRoleHandler);
router.get("/roles/:id", getRoleHandler);
router.put("/roles/:id", updateRoleHandler);
router.delete("/roles/:id", deleteRoleHandler);

// Permissions
router.get("/permissions", listPermissions);
router.post("/permissions", createPermissionHandler);
router.post("/permissions/attach", attachPermissionHandler);
router.post("/permissions/detach", detachPermissionHandler);
router.delete("/permissions/:id", deletePermissionHandler);

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

// Medical teams
router.get("/medical-teams", requireAnyPermission(["medical_teams:list"]), listMedicalTeamsHandler);
router.get(
  "/medical-team-members",
  requireAnyPermission(["medical_teams:create", "medical_teams:update"]),
  listMedicalTeamMemberCandidatesHandler,
);
router.post("/medical-teams", requireAnyPermission(["medical_teams:create"]), createMedicalTeamHandler);
router.get("/medical-teams/:id", requireAnyPermission(["medical_teams:read"]), getMedicalTeamHandler);
router.put("/medical-teams/:id", requireAnyPermission(["medical_teams:update"]), updateMedicalTeamHandler);
router.delete(
  "/medical-teams/:id",
  requireAnyPermission(["medical_teams:delete"]),
  deleteMedicalTeamHandler,
);

// Patients
router.get("/patients", requireAnyPermission(["patients:list"]), listPatientsHandler);
router.post("/patients", requireAnyPermission(["patients:create"]), createPatientHandler);
router.get("/patients/:id", requireAnyPermission(["patients:read"]), getPatientHandler);
router.put("/patients/:id", requireAnyPermission(["patients:update"]), updatePatientHandler);
router.delete(
  "/patients/:id",
  requireAnyPermission(["patients:delete"]),
  deletePatientHandler,
);
router.get("/lookups", requireAnyPermission(["patients:list", "patients:read"]), listLookupsHandler);

// Bookings
router.get("/bookings", requireAnyPermission(["bookings:list"]), listBookingsHandler);
router.post("/bookings", requireAnyPermission(["bookings:create"]), createBookingHandler);
router.get("/bookings/:id", requireAnyPermission(["bookings:read"]), getBookingHandler);
router.put("/bookings/:id", requireAnyPermission(["bookings:update"]), updateBookingHandler);
router.delete("/bookings/:id", requireAnyPermission(["bookings:delete"]), deleteBookingHandler);

// Invoices (subscription bill PDF)
router.get(
  "/invoices/:id/pdf",
  requireAnyPermission(["invoices:read", "patients:read", "profiles:read"]),
  getInvoicePdfHandler,
);

// Payments (subscription and other invoice payments)
router.get(
  "/payments",
  requireAnyPermission(["invoices:read", "patients:read", "profiles:read"]),
  listPaymentsHandler,
);

// Subscription plans
router.get(
  "/subscription-plan-types",
  requireAnyPermission(["profiles:list"]),
  listSubscriptionPlanTypesHandler,
);
router.get(
  "/subscription-plans",
  requireAnyPermission(["profiles:list", "patients:create", "patients:update", "patients:read"]),
  listSubscriptionPlansHandler,
);
router.post(
  "/subscription-plans",
  requireAnyPermission(["profiles:create"]),
  createSubscriptionPlanHandler,
);
router.get(
  "/subscription-plans/:id",
  requireAnyPermission(["profiles:read", "patients:create", "patients:update", "patients:read"]),
  getSubscriptionPlanHandler,
);
router.put(
  "/subscription-plans/:id",
  requireAnyPermission(["profiles:update"]),
  updateSubscriptionPlanHandler,
);
router.delete(
  "/subscription-plans/:id",
  requireAnyPermission(["profiles:delete"]),
  deleteSubscriptionPlanHandler,
);

// Subscription accounts
router.get(
  "/subscription-accounts",
  requireAnyPermission(["profiles:list", "patients:read"]),
  listSubscriptionAccountsHandler,
);
router.post(
  "/subscription-accounts",
  requireAnyPermission(["profiles:create", "patients:create"]),
  createSubscriptionAccountHandler,
);
router.get(
  "/subscription-accounts/:id",
  requireAnyPermission(["profiles:read", "patients:read"]),
  getSubscriptionAccountHandler,
);
router.put(
  "/subscription-accounts/:id",
  requireAnyPermission(["profiles:update", "patients:update"]),
  updateSubscriptionAccountHandler,
);
router.delete(
  "/subscription-accounts/:id",
  requireAnyPermission(["profiles:delete", "patients:delete"]),
  deleteSubscriptionAccountHandler,
);
router.post(
  "/subscription-accounts/:id/members",
  requireAnyPermission(["profiles:update", "patients:update", "patients:create"]),
  addSubscriptionMemberHandler,
);

router.delete(
  "/subscription-accounts/:id/members",
  requireAnyPermission(["profiles:update", "patients:update"]),
  detachSubscriptionMemberHandler,
);

export default router;

