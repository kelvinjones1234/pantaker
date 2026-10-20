import type { User } from "@/generated/prisma/client";
import { withUserContext } from "@/lib/db/context";

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
