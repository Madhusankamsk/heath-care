import type { NextFunction, Request, Response } from "express";
import prisma from "../prisma/client";

declare global {
  namespace Express {
    interface Request {
      permissionKeys?: string[];
    }
  }
}

async function loadPermissionKeys(req: Request): Promise<string[]> {
  if (req.permissionKeys) return req.permissionKeys;
  const userId = req.authUser?.sub;
  if (!userId) return [];

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

  const keys = user?.role?.permissions?.map((rp) => rp.permission.permissionKey) ?? [];
  req.permissionKeys = keys;
  return keys;
}

export function requireAnyPermission(required: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!required.length) return next();
    const keys = await loadPermissionKeys(req);
    const set = new Set(keys);
    const ok = required.some((k) => set.has(k));
    if (!ok) return res.status(403).json({ message: "Forbidden" });
    return next();
  };
}

