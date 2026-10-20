/**
 * Parsing and serialization for admin directory query strings. Every admin list
 * page (users, listings, reports) reads only these validated values, so an
 * untrusted `?page=`, `?status=`, or `?q=` can never reach a database query
 * unchecked. Pure and testable — see list-params.test.ts.
 */

export const ADMIN_PAGE_SIZE = 20;

/** Collapse a Next.js search param (which may be repeated) to one trimmed string. */
export function single(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

/** Free-text search term, capped so it can never become an unbounded query. */
export function parseSearchTerm(value: string | string[] | undefined, max = 80): string {
  return single(value).slice(0, max);
}

/** 1-based page number; anything malformed falls back to page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const parsed = Number(single(value));
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

/** One of `allowed`, or the fallback (`""` = "all"). Unknown values are dropped. */
export function parseEnum<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
  fallback: T | "" = "",
): T | "" {
  const raw = single(value);
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
}

/** A `YYYY-MM-DD` calendar date, or null. Used for date-range filters. */
export function parseDate(value: string | string[] | undefined): string | null {
  const raw = single(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return Number.isNaN(new Date(`${raw}T00:00:00Z`).getTime()) ? null : raw;
}

/**
 * Build a query string from a small record, dropping empty values so URLs stay
 * clean and a filter can be cleared by omitting its key. Page 1 is omitted too.
 */
export function buildQueryString(
  values: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (!text) continue;
    if (key === "page" && text === "1") continue;
    params.set(key, text);
  }
  return params.toString();
}

/** Append a query string to a path, omitting the "?" when empty. */
export function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

export interface AdminListParams {
  q: string;
  page: number;
}

/** The values every admin directory shares. */
export function parseAdminListParams(params: {
  q?: string | string[];
  page?: string | string[];
}): AdminListParams {
  return {
    q: parseSearchTerm(params.q),
    page: parsePage(params.page),
  };
}
