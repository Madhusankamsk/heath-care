/** Matches health-back `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE`. */
export const DEFAULT_PAGE_SIZE = 10;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function pageQueryString(
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  q?: string,
  extraParams?: Record<string, string | null | undefined>,
): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  const trimmed = typeof q === "string" ? q.trim() : "";
  if (trimmed.length > 0) p.set("q", trimmed);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      const nextValue = typeof value === "string" ? value.trim() : "";
      if (nextValue) p.set(key, nextValue);
    }
  }
  return p.toString();
}

/** Append page, pageSize, and optional search `q` to a path that may already contain `?`. */
export function withPaginationQuery(
  path: string,
  page: number,
  pageSize?: number,
  q?: string,
): string {
  const qs = pageQueryString(page, pageSize ?? DEFAULT_PAGE_SIZE, q);
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${qs}`;
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
