import type { Prisma, User } from "@/generated/prisma/client";
import { withUserContext } from "@/lib/db/context";
import { orderDedupeKey } from "@/features/notifications/rules";

/**
 * Notification emission helpers. Trusted database functions derive the
 * recipient from the referenced row, so the client never supplies a recipient.
 * Delivery is best-effort: a notification failure must never fail the user
 * action that triggered it.
 */

type Actor = Pick<User, "id" | "admin_role">;

export type AccountNotificationType = "account_email_change";

/** Notify the other party that `messageId` was sent in `inquiryId`. */
export async function emitNewMessageNotification(
  actor: Actor,
  inquiryId: string,
  messageId: string,
): Promise<void> {
  try {
    await withUserContext(actor, (tx) =>
      tx.$executeRaw`select public.notify_new_message(${inquiryId}::uuid, ${messageId}::uuid)`,
    );
  } catch {
    // Notifications are a side effect, not part of the message transaction.
  }
}

/** Notify a sale's buyer (when it has one) of the sale's current status. */
export async function emitSaleStatusNotification(actor: Actor, saleId: string): Promise<void> {
  try {
    await withUserContext(actor, (tx) =>
      tx.$executeRaw`select public.notify_sale_status(${saleId}::uuid)`,
    );
  } catch {
    // Best effort.
  }
}

/** Record an account event for the acting user themselves. */
export async function emitAccountEventNotification(
  actor: Actor,
  type: AccountNotificationType,
): Promise<void> {
  try {
    await withUserContext(actor, (tx) =>
      tx.$executeRaw`select public.notify_account_event(${type})`,
    );
  } catch {
    // Best effort.
  }
}

export type OrderNotificationEvent =
  | "paid"
  | "ready"
  | "handover"
  | "released"
  | "refunded"
  | "disputed"
  | "cancelled"
  | "issue"
  | "payment_failed"
  | "expired";

export interface OrderNotificationRecipient {
  userId: string;
  title: string;
  body?: string | null;
  href: string;
}

/**
 * Record order events for the buyer and/or seller inside the caller's existing
 * transaction. The service layer already knows both parties and the order, so
 * the recipient is never taken from a request. Delivery is best-effort: a
 * notification failure must not roll back a money transition. Users who turned
 * off order updates are skipped, and the dedupe key makes provider retries
 * idempotent.
 */
type NotificationWriter = Pick<
  Prisma.TransactionClient,
  "notificationPreference" | "notification"
>;

export async function emitOrderNotifications(
  tx: NotificationWriter,
  input: {
    orderId: string;
    event: OrderNotificationEvent;
    recipients: OrderNotificationRecipient[];
    /** Refines the dedupe key when one event can carry multiple states. */
    dedupeSuffix?: string;
  },
): Promise<void> {
  if (input.recipients.length === 0) return;

  try {
    const userIds = [...new Set(input.recipients.map((recipient) => recipient.userId))];
    const preferences = await tx.notificationPreference.findMany({
      where: { user_id: { in: userIds } },
      select: { user_id: true, order_updates: true },
    });
    const muted = new Set(
      preferences.filter((preference) => !preference.order_updates).map((p) => p.user_id),
    );

    const rows = input.recipients
      .filter((recipient) => !muted.has(recipient.userId))
      .map((recipient) => ({
        user_id: recipient.userId,
        type: `order_${input.event}`,
        title: recipient.title,
        body: recipient.body ?? null,
        href: recipient.href,
        dedupe_key: orderDedupeKey(
          input.orderId,
          input.dedupeSuffix ?? input.event,
        ),
      }));
    if (rows.length === 0) return;

    await tx.notification.createMany({ data: rows, skipDuplicates: true });
  } catch {
    // Best effort.
  }
}
