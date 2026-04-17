/** Matches health-back `DEFAULT_PAGE_SIZE` / `MAX_PAGE_SIZE`. */
export const DEFAULT_PAGE_SIZE = 10;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export function pageQueryString(page: number, pageSize: number = DEFAULT_PAGE_SIZE): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("pageSize", String(pageSize));
  return p.toString();
}

/** Append page and pageSize to a path that may already contain `?`. */
export function withPaginationQuery(path: string, page: number, pageSize?: number): string {
  const qs = pageQueryString(page, pageSize ?? DEFAULT_PAGE_SIZE);
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${qs}`;
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / pageSize));
}
