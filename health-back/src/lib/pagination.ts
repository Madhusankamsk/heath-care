import type { Request, Response } from "express";

/** Trimmed non-empty search string from `req.query[name]` (default `q`), or undefined. */
export function parseOptionalQueryString(req: Request, name = "q"): string | undefined {
  const raw = req.query[name];
  const s = typeof raw === "string" ? raw.trim() : "";
  return s.length > 0 ? s : undefined;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

export type ParsedPagination = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
};

export type PaginatedBody<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

/** Parse `page` (1-based) and `pageSize` from Express query; clamp pageSize to MAX_PAGE_SIZE. */
export function parsePaginationQuery(req: Request): ParsedPagination {
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const rawSize = parsePositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE);
  const pageSize = Math.min(Math.max(rawSize, 1), MAX_PAGE_SIZE);
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function okPaginated<T>(res: Response, body: PaginatedBody<T>): Response {
  return res.json(body);
}
