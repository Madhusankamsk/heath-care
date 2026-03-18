import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.AUTH_JWT_SECRET;

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!JWT_SECRET) {
    return res.status(500).json({ message: "Auth not configured on server" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.authUser = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

