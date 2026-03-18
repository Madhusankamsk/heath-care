import { Router } from "express";
import { requireAuth } from "../middleware/auth";
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
  getProfileHandler,
  listProfiles,
  updateProfileHandler,
} from "../controllers/profileController";
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
router.get("/profiles", listProfiles);
router.post("/profiles", createProfileHandler);
router.get("/profiles/:id", getProfileHandler);
router.put("/profiles/:id", updateProfileHandler);
router.post("/profiles/:id/deactivate", deactivateProfileHandler);

export default router;

