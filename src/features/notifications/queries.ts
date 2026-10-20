import { requireUser } from "@/features/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import type { AppNotification, NotificationPreferences } from "@/types/marketplace";

export const NOTIFICATION_PAGE_SIZE = 50;

/** Everything on when a user has never saved preferences — matches the DB default. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  user_id: "",
  messages: true,
  sale_updates: true,
  listing_updates: true,
  updated_at: "",
};

export async function getNotifications(limit = NOTIFICATION_PAGE_SIZE): Promise<AppNotification[]> {
  const user = await requireUser("/notifications");
  if (!user) return [];

  const rows = await getPrisma().notification.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    ...row,
    type: row.type as AppNotification["type"],
    read_at: row.read_at?.toISOString() ?? null,
    created_at: row.created_at.toISOString(),
  }));
}

/** Real unread count for the signed-in user, used for the rail badge. */
export async function getUnreadNotificationCount(): Promise<number> {
  const user = await requireUser("/notifications");
  if (!user) return 0;

  return getPrisma().notification.count({
    where: { user_id: user.id, read_at: null },
  });
}

/**
 * The signed-in user's preferences, defaulting to "everything on" when they have
 * never saved a row. The returned id always comes from the session.
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const user = await requireUser("/notifications");
  if (!user) return { ...DEFAULT_NOTIFICATION_PREFERENCES };

  const row = await getPrisma().notificationPreference.findUnique({
    where: { user_id: user.id },
  });

  if (!row) return { ...DEFAULT_NOTIFICATION_PREFERENCES, user_id: user.id };
  return {
    ...row,
    updated_at: row.updated_at.toISOString(),
  };
}
