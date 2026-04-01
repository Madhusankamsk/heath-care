import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

/**
 * Express 4 does not await async route handlers. Without `express-async-errors`,
 * rejected promises become unhandled rejections and can terminate the process.
 * This handler maps known errors to HTTP responses and logs the rest.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const { code, meta } = err;
    if (code === "P2002") {
      res.status(409).json({ message: "A record with this value already exists." });
      return;
    }
    if (code === "P2025") {
      res.status(404).json({ message: "Record not found." });
      return;
    }
    if (code === "P2021" || code === "P2010" || code === "P2013") {
      console.error("[Prisma schema / DB]", err);
      res.status(503).json({
        message: "Database is unavailable or schema is out of date. Run migrations.",
        ...(process.env.NODE_ENV !== "production" && { code, meta }),
      });
      return;
    }
    console.error("[Prisma]", err);
    res.status(400).json({
      message: "Database request could not be completed.",
      ...(process.env.NODE_ENV !== "production" && { code, meta }),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error("[Prisma validation]", err);
    res.status(400).json({ message: "Invalid request data." });
    return;
  }

  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production" ? "Internal server error" : message,
  });
}
