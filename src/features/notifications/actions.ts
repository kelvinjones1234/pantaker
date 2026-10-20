"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/features/auth/authorization";
import { getPrisma } from "@/lib/prisma";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";

export type NotificationActionResult =
  | { ok: true; message?: string }
  | { ok: false; error?: string; errors?: Record<string, string[] | undefined> };

function revalidateNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/seller");
  revalidatePath("/seller/settings/notifications");
}

/** Mark one notification as read. Scoped to the session user. */
export async function markNotificationReadAction(id: string): Promise<NotificationActionResult> {
  const user = await requireUserForAction("/notifications");

  try {
    await getPrisma().notification.updateMany({
      where: { id, user_id: user.id, read_at: null },
      data: { read_at: new Date() },
    });
  } catch {
    return { ok: false, error: "We couldn't update that notification." };
  }

  revalidateNotifications();
  return { ok: true };
}

/** Mark every unread notification for the session user as read. */
export async function markAllNotificationsReadAction(): Promise<NotificationActionResult> {
  const user = await requireUserForAction("/notifications");

  try {
    await getPrisma().notification.updateMany({
      where: { user_id: user.id, read_at: null },
      data: { read_at: new Date() },
    });
  } catch {
    return { ok: false, error: "We couldn't update your notifications." };
  }

  revalidateNotifications();
  return { ok: true, message: "All notifications marked as read." };
}

/**
 * Save the signed-in user's notification preferences. The row id is always the
 * session user id; no id is ever read from the request.
 */
export async function updateNotificationPreferencesAction(
  formData: FormData,
): Promise<NotificationActionResult> {
  const user = await requireUserForAction("/seller/settings/notifications");

  const parsed = notificationPreferencesSchema.safeParse({
    messages: formData.get("messages"),
    sale_updates: formData.get("sale_updates"),
    listing_updates: formData.get("listing_updates"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Those preferences could not be read." };
  }

  try {
    await getPrisma().notificationPreference.upsert({
      where: { user_id: user.id },
      create: { user_id: user.id, ...parsed.data, updated_at: new Date() },
      update: { ...parsed.data, updated_at: new Date() },
    });
  } catch {
    return { ok: false, error: "Could not save your preferences. Please try again." };
  }

  revalidatePath("/seller/settings/notifications");
  return { ok: true, message: "Notification preferences saved." };
}
