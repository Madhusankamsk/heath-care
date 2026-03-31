"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/lib/toast";

type Role = {
  id: string;
  roleName: string;
  description?: string | null;
};

type Permission = {
  id: string;
  permissionKey: string;
};

type RolePermissionMatrixProps = {
  roles: Role[];
  permissions: Permission[];
};

type Mapping = {
  [roleId: string]: Set<string>; // permissionId set
};

export function RolePermissionMatrix({ roles, permissions }: RolePermissionMatrixProps) {
  const [mapping, setMapping] = useState<Mapping>({});
  const [localPermissions, setLocalPermissions] = useState<Permission[]>(permissions);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionPendingDelete, setPermissionPendingDelete] =
    useState<Permission | null>(null);

  const sortedRoles = useMemo(
    () =>
      [...roles].sort((a, b) => a.roleName.localeCompare(b.roleName, undefined, { sensitivity: "base" })),
    [roles],
  );

  const sortedPermissions = useMemo(
    () =>
      [...localPermissions].sort((a, b) =>
        a.permissionKey.localeCompare(b.permissionKey, undefined, { sensitivity: "base" }),
      ),
    [localPermissions],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/roles-with-permissions").catch(() => null);
        if (!res || !res.ok) {
          throw new Error("Failed to load role-permission mappings.");
        }
        const data = (await res.json().catch(() => null)) as
          | (Role & { permissions?: { permissionId: string }[] })[]
          | null;
        if (!data) throw new Error("Failed to parse role-permission response.");
        if (cancelled) return;
        const next: Mapping = {};
        for (const role of data) {
          const ids = new Set<string>();
          for (const rp of role.permissions ?? []) {
            ids.add(rp.permissionId);
          }
          next[role.id] = ids;
        }
        setMapping(next);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong loading mappings.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(roleId: string, permission: Permission) {
    setError(null);
    const current = mapping[roleId] ?? new Set<string>();
    const has = current.has(permission.id);

    // optimistic update
    setMapping((prev) => {
      const copy: Mapping = {};
      for (const [rId, set] of Object.entries(prev)) {
        copy[rId] = new Set(set);
      }
      const nextSet = copy[roleId] ?? new Set<string>();
      if (has) {
        nextSet.delete(permission.id);
      } else {
        nextSet.add(permission.id);
      }
      copy[roleId] = nextSet;
      return copy;
    });

    try {
      const endpoint = has ? "/api/permissions/detach" : "/api/permissions/attach";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId, permissionId: permission.id }),
      });
      if (!res.ok) {
        throw new Error(
          has ? "Failed to detach permission from role." : "Failed to attach permission to role.",
        );
      }
    } catch (e) {
      // revert optimistic change on failure
      setMapping((prev) => {
        const copy: Mapping = {};
        for (const [rId, set] of Object.entries(prev)) {
          copy[rId] = new Set(set);
        }
        const nextSet = copy[roleId] ?? new Set<string>();
        if (has) {
          // we had removed; add back
          nextSet.add(permission.id);
        } else {
          // we had added; remove again
          nextSet.delete(permission.id);
        }
        copy[roleId] = nextSet;
        return copy;
      });
      const msg = e instanceof Error ? e.message : "Something went wrong updating mapping.";
      setError(msg);
      toast.error(msg);
    }
  }

  async function performDeletePermission(permission: Permission) {
    setError(null);
    const attachedSomewhere = Object.values(mapping).some((set) => set.has(permission.id));
    if (attachedSomewhere) {
      const msg = "Cannot delete a permission that is still attached to a role.";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      const res = await fetch(`/api/permissions/${permission.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const msg = await res.text().catch(() => "");
        throw new Error(msg || "Failed to delete permission.");
      }
      setLocalPermissions((prev) => prev.filter((p) => p.id !== permission.id));
      toast.success("Permission deleted");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong deleting permission.";
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ConfirmModal
        open={permissionPendingDelete !== null}
        title="Delete permission?"
        message={
          permissionPendingDelete
            ? `Are you sure you want to delete permission "${permissionPendingDelete.permissionKey}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="delete"
        onCancel={() => setPermissionPendingDelete(null)}
        onConfirm={() => {
          if (!permissionPendingDelete) return;
          const perm = permissionPendingDelete;
          setPermissionPendingDelete(null);
          void performDeletePermission(perm);
        }}
      />
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <span>Toggle which permissions each role has.</span>
        <span>{isLoading ? "Loading role mappings…" : null}</span>
      </div>

      <div className="max-h-96 overflow-x-auto overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <Table className="border-collapse">
          <TableHeader className="sticky top-0 z-10 bg-white dark:bg-zinc-950">
            <TableRow className="border-b border-zinc-200 text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <TableHead className="px-3 py-2">Permission</TableHead>
              {sortedRoles.map((role) => (
                <TableHead key={role.id} className="px-3 py-2 text-center">
                  {role.roleName}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPermissions.map((perm) => {
              const canDelete = !Object.values(mapping).some((set) => set.has(perm.id));
              return (
                <TableRow
                  key={perm.id}
                  className="border-t border-zinc-200 align-middle dark:border-zinc-800"
                >
                  <TableCell className="px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                        {perm.permissionKey}
                      </span>
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="delete"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setPermissionPendingDelete(perm)}
                        >
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                  {sortedRoles.map((role) => {
                    const has = mapping[role.id]?.has(perm.id) ?? false;
                    return (
                      <TableCell key={role.id} className="px-3 py-1 text-center">
                        <button
                          type="button"
                          onClick={() => toggle(role.id, perm)}
                          className={[
                            "inline-flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold",
                            has
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-zinc-300 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
                          ].join(" ")}
                          aria-label={
                            has
                              ? `Remove ${perm.permissionKey} from ${role.roleName}`
                              : `Grant ${perm.permissionKey} to ${role.roleName}`
                          }
                        >
                          {has ? "●" : "○"}
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" /> Attached
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border border-zinc-400 dark:border-zinc-600" />{" "}
          Not attached
        </span>
      </div>
    </div>
  );
}

