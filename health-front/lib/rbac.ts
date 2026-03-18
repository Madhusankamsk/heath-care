export type PermissionKey = string;

export function hasAnyPermission(
  userPermissions: PermissionKey[] | undefined,
  required: PermissionKey[],
): boolean {
  if (!required.length) return true;
  const set = new Set(userPermissions ?? []);
  return required.some((perm) => set.has(perm));
}

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return normalized === "admin" || normalized === "super_admin" || normalized === "superadmin";
}

export function isSuperAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return normalized === "super_admin" || normalized === "superadmin";
}

