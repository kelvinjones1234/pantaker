/**
 * Admin date/time display. Pantaker operates in Abuja, so every admin-facing
 * timestamp is formatted in one fixed timezone (WAT, UTC+1, no DST) rather than
 * the viewer's locale, keeping the dashboard consistent for every operator.
 * Pure and testable.
 */

export const ADMIN_TIME_ZONE = "Africa/Lagos";

function formatter(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat("en-NG", { timeZone: ADMIN_TIME_ZONE, ...options });
}

const DATE_FORMAT = formatter({ day: "numeric", month: "short", year: "numeric" });
const DATE_TIME_FORMAT = formatter({
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** True when `value` is a parseable ISO timestamp string. */
export function isValidDateValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0 && !Number.isNaN(new Date(value).getTime());
}

/** e.g. "6 Jan 2026". Returns an em dash for missing/invalid input. */
export function formatAdminDate(value: string | null | undefined): string {
  return isValidDateValue(value) ? DATE_FORMAT.format(new Date(value)) : "—";
}

/** e.g. "6 Jan 2026, 00:30". Returns an em dash for missing/invalid input. */
export function formatAdminDateTime(value: string | null | undefined): string {
  return isValidDateValue(value) ? DATE_TIME_FORMAT.format(new Date(value)) : "—";
}

/**
 * Start-of-day boundary for an admin date filter, expressed in the admin
 * timezone and returned as an ISO instant for a stable `>=` comparison.
 */
export function adminDayStartIso(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00+01:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
