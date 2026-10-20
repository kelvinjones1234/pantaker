/**
 * Shared pagination maths. Extracted so the marketplace browser and the admin
 * directories compute page windows identically. Pure and fully testable.
 */

export type PageEntry = number | "gap";

/** Number of pages for `totalItems` at `pageSize`. Never below 1 for non-empty. */
export function totalPagesFor(totalItems: number, pageSize: number): number {
  if (pageSize <= 0) return 0;
  const items = Math.max(0, Math.trunc(totalItems));
  if (items === 0) return 0;
  return Math.ceil(items / pageSize);
}

/** Coerce any input into a valid 1-based page within `totalPages`. */
export function clampPage(page: number, totalPages: number): number {
  const upper = Math.max(1, totalPages);
  if (!Number.isFinite(page)) return 1;
  const whole = Math.trunc(page);
  if (whole < 1) return 1;
  if (whole > upper) return upper;
  return whole;
}

/** Compact page list with `"gap"` markers, e.g. [1, "gap", 4, 5, 6, "gap", 20]. */
export function pageWindow(page: number, totalPages: number, span = 1): PageEntry[] {
  if (totalPages <= 0) return [];
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);

  const current = clampPage(page, totalPages);
  const pages: PageEntry[] = [1];
  const start = Math.max(2, current - span);
  const end = Math.min(totalPages - 1, current + span);
  if (start > 2) pages.push("gap");
  for (let index = start; index <= end; index += 1) pages.push(index);
  if (end < totalPages - 1) pages.push("gap");
  pages.push(totalPages);
  return pages;
}

export interface PageRange {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
}

/** "Showing from–to of total" maths for a paginated result set. */
export function pageRange(page: number, pageSize: number, totalItems: number): PageRange {
  const total = Math.max(0, Math.trunc(totalItems));
  const totalPages = totalPagesFor(total, pageSize);
  const current = clampPage(page, totalPages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = total === 0 ? 0 : Math.min(total, current * pageSize);
  return { page: current, totalPages, from, to, total };
}

/** Zero-based offset for a stable `.range(from, to)` query. */
export function pageOffset(page: number, pageSize: number): number {
  return (Math.max(1, Math.trunc(page)) - 1) * pageSize;
}
