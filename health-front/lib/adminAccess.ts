import { isAdminRole, isSuperAdminRole } from "@/lib/rbac";

export function canAccessAdmin(
  role: string | null | undefined,
  permissions: string[] | undefined,
): boolean {
  // Role-based override (current project behavior)
  if (isAdminRole(role)) return true;

  // Permission-based access (fallback until keys are standardized)
  const set = new Set(permissions ?? []);
  const keys = [
    "admin:access",
    "roles:read",
    "roles:list",
    "permissions:read",
    "permissions:list",
  ];
  return keys.some((k) => set.has(k));
}

export function canAccessSuperAdmin(
  role: string | null | undefined,
  permissions: string[] | undefined,
): boolean {
  // Only super admin by role (recommended)
  if (isSuperAdminRole(role)) return true;

  // Optional permission fallback
  const set = new Set(permissions ?? []);
  return set.has("super_admin:access") || set.has("superadmin:access");
}

