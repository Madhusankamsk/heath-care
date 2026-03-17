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

const router = Router();

// Protect RBAC routes with auth middleware
router.use(requireAuth);

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

