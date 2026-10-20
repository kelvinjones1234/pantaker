import type { AppNotification, NotificationType } from "@/types/marketplace";

/**
 * Pure notification rules. Kept free of Supabase/Next so the security-relevant
 * decisions (who counts as unread, how a preference maps to an event, how dedupe
 * keys are formed) are unit-testable and match the SQL in
 * supabase/migrations/0004_notifications.sql exactly.
 */

export const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "listing_published",
  "listing_rejected",
  "new_message",
  "sale_status_changed",
  "account_email_change",
] as const;

/** The three switchable preference columns on `notification_preferences`. */
export type NotificationPreferenceKey = "messages" | "sale_updates" | "listing_updates";

/**
 * Presentation metadata per event type, plus the preference that governs it.
 * `account_email_change` has no preference: account/security notices are always
 * delivered and are deliberately not muteable.
 *
 * This mapping MUST mirror the `case p_kind` in `public.notification_enabled`.
 */
export const NOTIFICATION_META: Record<
  NotificationType,
  { label: string; preference: NotificationPreferenceKey | null }
> = {
  listing_published: { label: "Listing approved", preference: "listing_updates" },
  listing_rejected: { label: "Listing needs changes", preference: "listing_updates" },
  new_message: { label: "Message", preference: "messages" },
  sale_status_changed: { label: "Sale update", preference: "sale_updates" },
  account_email_change: { label: "Account", preference: null },
};

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

/** The preference column that governs a type, or null when it is always on. */
export function preferenceKeyForType(type: NotificationType): NotificationPreferenceKey | null {
  return NOTIFICATION_META[type]?.preference ?? null;
}

/** An event is unread until its `read_at` marker is set. */
export function isUnread(notification: Pick<AppNotification, "read_at">): boolean {
  return notification.read_at === null;
}

export function countUnread(notifications: Pick<AppNotification, "read_at">[]): number {
  return notifications.filter(isUnread).length;
}

/** Newest first, without mutating the input. ISO timestamps compare as strings. */
export function sortByNewest<T extends Pick<AppNotification, "created_at">>(notifications: T[]): T[] {
  return [...notifications].sort((a, b) =>
    a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
  );
}

/** Split into unread and read, each newest first. */
export function splitByRead<T extends Pick<AppNotification, "read_at" | "created_at">>(
  notifications: T[],
): { unread: T[]; read: T[] } {
  const sorted = sortByNewest(notifications);
  return {
    unread: sorted.filter(isUnread),
    read: sorted.filter((notification) => !isUnread(notification)),
  };
}

/**
 * Dedupe key for a message notification. Mirrors the SQL
 * `'message:' || p_message_id` so a retried send cannot double-notify.
 */
export function messageDedupeKey(messageId: string): string {
  return `message:${messageId}`;
}

/**
 * Dedupe key for a sale notification. Mirrors the SQL
 * `'sale:' || id || ':' || status`, so each distinct status change notifies once.
 */
export function saleDedupeKey(saleId: string, status: string): string {
  return `sale:${saleId}:${status}`;
}
