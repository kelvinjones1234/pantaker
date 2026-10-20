"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/features/auth/authorization";
import { checkAccountCanWrite } from "@/features/accounts/access";
import {
  resolveInquirySeller,
  type OwnedRecord,
} from "@/features/listings/ownership";
import {
  conversationReportSchema,
  sendMessageSchema,
  startConversationSchema,
} from "@/lib/validation/messaging";
import {
  canSendMessage,
  otherPartyId,
  roleInConversation,
  withinLimit,
} from "@/features/messaging/rules";
import { emitNewMessageNotification } from "@/features/notifications/emit";
import { messagingLimits } from "@/config/site";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import { withUserContext, type TransactionClient } from "@/lib/db/context";
import type { User } from "@/generated/prisma/client";
import type { Conversation, ItemStatus, Message } from "@/types/marketplace";

export type MessageActionResult =
  | { ok: true; id?: string; message?: Message; notice?: string }
  | {
      ok: false;
      error?: string;
      errors?: Record<string, string[] | undefined>;
    };

function isConfigured() {
  return isPrismaConfigured();
}

async function hasBlockBetween(a: string, b: string): Promise<boolean> {
  const block = await getPrisma().block.findFirst({
    where: {
      OR: [
        { blocker_id: a, blocked_id: b },
        { blocker_id: b, blocked_id: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(block);
}

function toMessage(row: {
  id: string;
  inquiry_id: string;
  sender_id: string;
  body: string;
  created_at: Date;
}): Message {
  return { ...row, created_at: row.created_at.toISOString() };
}

function revalidateMessaging(conversationId?: string) {
  revalidatePath("/messages");
  revalidatePath("/seller/messages");
  if (conversationId) {
    revalidatePath(`/messages/${conversationId}`);
    revalidatePath(`/seller/messages/${conversationId}`);
  }
}

async function findConversation(tx: TransactionClient, conversationId: string) {
  return tx.inquiry.findUnique({
    where: { id: conversationId },
    select: { id: true, buyer_id: true, seller_id: true, listing_id: true },
  });
}

/**
 * Start a conversation from a listing. The buyer is the session user and the
 * seller is resolved from the listing row (never the client). Reuses an existing
 * thread for the same listing+buyer instead of creating duplicates, honours
 * blocks in both directions, and rate-limits new conversations per hour.
 */
export async function startConversationAction(
  formData: FormData,
): Promise<MessageActionResult> {
  const user = await requireUserForAction("/messages");

  if (!isConfigured()) {
    return { ok: false, error: "Messaging needs database configuration." };
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = startConversationSchema.safeParse({
    listing_id: formData.get("listing_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const listing = await getPrisma().listing.findUnique({
    where: { id: parsed.data.listing_id },
    select: { seller_id: true, item_status: true },
  });

  const resolution = resolveInquirySeller(
    listing as OwnedRecord | null,
    user.id,
  );
  if (!resolution.ok) return { ok: false, error: resolution.error };
  if (listing && listing.item_status === "archived") {
    return { ok: false, error: "This listing is no longer available." };
  }

  if (await hasBlockBetween(user.id, resolution.sellerId)) {
    return {
      ok: false,
      error: "You can't start a conversation with this seller.",
    };
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentConversations = await getPrisma().inquiry.count({
    where: { buyer_id: user.id, created_at: { gt: hourAgo } },
  });
  if (
    !withinLimit(recentConversations, messagingLimits.newConversationsPerHour)
  ) {
    return {
      ok: false,
      error: "You've started too many conversations. Please try again later.",
    };
  }

  const now = new Date();

  const result = await withUserContext(user, async (tx) => {
    const existing = await tx.inquiry.findFirst({
      where: {
        listing_id: parsed.data.listing_id,
        buyer_id: user.id,
        seller_id: resolution.sellerId,
      },
      select: { id: true },
    });

    const conversationId =
      existing?.id ??
      (
        await tx.inquiry.create({
          data: {
            listing_id: parsed.data.listing_id,
            buyer_id: user.id,
            seller_id: resolution.sellerId,
            message: parsed.data.body,
            last_message_at: now,
          },
          select: { id: true },
        })
      ).id;

    const message = await tx.message.create({
      data: {
        inquiry_id: conversationId,
        sender_id: user.id,
        body: parsed.data.body,
      },
      select: {
        id: true,
        inquiry_id: true,
        sender_id: true,
        body: true,
        created_at: true,
      },
    });

    await tx.inquiry.update({
      where: { id: conversationId },
      data: { last_message_at: now },
    });

    return { conversationId, message };
  });

  await emitNewMessageNotification(
    user,
    result.conversationId,
    result.message.id,
  );

  revalidateMessaging(result.conversationId);
  return {
    ok: true,
    id: result.conversationId,
    message: toMessage(result.message),
  };
}

/** Send a reply in a conversation the caller participates in. */
export async function sendMessageAction(
  formData: FormData,
): Promise<MessageActionResult> {
  const user = await requireUserForAction("/messages");

  if (!isConfigured()) {
    return { ok: false, error: "Messaging needs database configuration." };
  }

  const access = await checkAccountCanWrite();
  if (!access.ok) return { ok: false, error: access.error };

  const parsed = sendMessageSchema.safeParse({
    inquiry_id: formData.get("inquiry_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const conversation = await getPrisma().inquiry.findUnique({
    where: { id: parsed.data.inquiry_id },
    select: { id: true, buyer_id: true, seller_id: true },
  });

  const role = roleInConversation(conversation, user.id);
  const other = otherPartyId(conversation, user.id);
  if (!conversation || !role || !other) {
    return { ok: false, error: "You're not part of this conversation." };
  }

  const blocked = await hasBlockBetween(user.id, other);
  const guard = canSendMessage({
    isParticipant: true,
    blockedByMe: blocked,
    blockedMe: blocked,
  });
  if (!guard.ok) return { ok: false, error: guard.reason };

  const minuteAgo = new Date(Date.now() - 60 * 1000);
  const recentMessages = await getPrisma().message.count({
    where: { sender_id: user.id, created_at: { gt: minuteAgo } },
  });
  if (!withinLimit(recentMessages, messagingLimits.messagesPerMinute)) {
    return {
      ok: false,
      error: "You're sending messages too quickly. Please wait a moment.",
    };
  }

  const now = new Date();
  const inserted = await withUserContext(user, async (tx) => {
    const message = await tx.message.create({
      data: {
        inquiry_id: conversation.id,
        sender_id: user.id,
        body: parsed.data.body,
      },
      select: {
        id: true,
        inquiry_id: true,
        sender_id: true,
        body: true,
        created_at: true,
      },
    });
    await tx.inquiry.update({
      where: { id: conversation.id },
      data: { last_message_at: now },
    });
    return message;
  });

  await emitNewMessageNotification(user, conversation.id, inserted.id);

  revalidateMessaging(conversation.id);
  return { ok: true, message: toMessage(inserted) };
}

/** Poll for messages newer than the last one the client has seen. */
export async function fetchConversationMessagesAction(
  conversationId: string,
  after?: string,
): Promise<{ ok: true; messages: Message[] } | { ok: false; error: string }> {
  const user = await requireUserForAction("/messages");
  if (!isConfigured())
    return { ok: false, error: "Messaging needs database configuration." };

  const conversation = await getPrisma().inquiry.findUnique({
    where: { id: conversationId },
    select: { buyer_id: true, seller_id: true },
  });
  if (!roleInConversation(conversation as Conversation | null, user.id)) {
    return { ok: false, error: "You're not part of this conversation." };
  }

  const afterDate = after ? new Date(after) : null;
  const rows = await getPrisma().message.findMany({
    where: {
      inquiry_id: conversationId,
      ...(afterDate && !Number.isNaN(afterDate.getTime())
        ? { created_at: { gt: afterDate } }
        : {}),
    },
    orderBy: { created_at: "asc" },
    take: 100,
  });

  return { ok: true, messages: rows.map(toMessage) };
}

/** Mark the caller's side of a conversation as read. */
export async function markConversationReadAction(
  conversationId: string,
): Promise<MessageActionResult> {
  const user = await requireUserForAction("/messages");
  if (!isConfigured()) return { ok: false };

  const conversation = await getPrisma().inquiry.findUnique({
    where: { id: conversationId },
    select: { buyer_id: true, seller_id: true },
  });

  const role = roleInConversation(conversation as Conversation | null, user.id);
  if (!role)
    return { ok: false, error: "You're not part of this conversation." };

  const now = new Date();
  await withUserContext(user, (tx) =>
    tx.inquiry.update({
      where: { id: conversationId },
      data:
        role === "buyer"
          ? { buyer_last_read_at: now }
          : { seller_last_read_at: now },
    }),
  );

  revalidateMessaging(conversationId);
  return { ok: true };
}

async function loadConversationForUser(
  conversationId: string,
  userId: string,
): Promise<{ id: string; other: string; listing_id: string } | null> {
  const conversation = await getPrisma().inquiry.findUnique({
    where: { id: conversationId },
    select: { id: true, buyer_id: true, seller_id: true, listing_id: true },
  });
  const other = otherPartyId(
    conversation
      ? { buyer_id: conversation.buyer_id, seller_id: conversation.seller_id }
      : null,
    userId,
  );
  if (!conversation || !other) return null;
  return { id: conversation.id, other, listing_id: conversation.listing_id };
}

/** Block the other participant of a conversation the caller belongs to. */
export async function blockUserAction(
  formData: FormData,
): Promise<MessageActionResult> {
  const user = await requireUserForAction("/messages");
  if (!isConfigured())
    return { ok: false, error: "Blocking needs database configuration." };

  const conversationId = String(formData.get("inquiry_id") ?? "");
  const context = await loadConversationForUser(conversationId, user.id);
  if (!context) return { ok: false, error: "You can't block this person." };

  await getPrisma().block.upsert({
    where: {
      blocker_id_blocked_id: { blocker_id: user.id, blocked_id: context.other },
    },
    create: { blocker_id: user.id, blocked_id: context.other },
    update: {},
  });

  revalidateMessaging(context.id);
  return {
    ok: true,
    notice: "You've blocked this person. They can no longer message you.",
  };
}

/** Unblock the other participant of a conversation the caller belongs to. */
export async function unblockUserAction(
  formData: FormData,
): Promise<MessageActionResult> {
  const user = await requireUserForAction("/messages");
  if (!isConfigured())
    return { ok: false, error: "Unblocking needs database configuration." };

  const conversationId = String(formData.get("inquiry_id") ?? "");
  const context = await loadConversationForUser(conversationId, user.id);
  if (!context) return { ok: false, error: "You can't unblock this person." };

  await getPrisma().block.deleteMany({
    where: { blocker_id: user.id, blocked_id: context.other },
  });

  revalidateMessaging(context.id);
  return { ok: true, notice: "You've unblocked this person." };
}

/**
 * Report the other participant of a conversation. The reported user is derived
 * from the conversation server-side; the client only supplies a reason and note.
 */
export async function reportConversationAction(
  formData: FormData,
): Promise<MessageActionResult> {
  const user = await requireUserForAction("/messages");
  if (!isConfigured())
    return { ok: false, error: "Reporting needs database configuration." };

  const parsed = conversationReportSchema.safeParse({
    inquiry_id: formData.get("inquiry_id"),
    reason: formData.get("reason"),
    details: formData.get("details"),
  });
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors };
  }

  const context = await loadConversationForUser(
    parsed.data.inquiry_id,
    user.id,
  );
  if (!context)
    return { ok: false, error: "You can't report this conversation." };

  await getPrisma().report.create({
    data: {
      reporter_id: user.id,
      reported_user_id: context.other,
      conversation_id: context.id,
      listing_id: context.listing_id,
      reason: parsed.data.reason,
      details: parsed.data.details,
    },
  });

  return { ok: true, notice: "Thanks — our team will review this report." };
}
