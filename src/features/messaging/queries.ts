import { requireUser } from "@/features/auth/authorization";
import { messagingLimits } from "@/config/site";
import {
  canSendMessage,
  roleInConversation,
  summariseConversation,
} from "@/features/messaging/rules";
import type {
  Block,
  Conversation,
  ConversationListingRef,
  ConversationParticipant,
  ConversationRole,
  ConversationSummary,
  ItemStatus,
  Message,
} from "@/types/marketplace";
import { getPrisma } from "@/lib/prisma";

/**
 * Messaging reads. Every query is scoped to the session user's id, so a
 * manipulated conversation id can only ever resolve to a thread the caller
 * belongs to (or nothing). Callers never pass a user id.
 */

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function toConversation(row: {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: Date;
  created_at: Date;
  buyer_last_read_at: Date | null;
  seller_last_read_at: Date | null;
}): Conversation {
  return {
    id: row.id,
    listing_id: row.listing_id,
    buyer_id: row.buyer_id,
    seller_id: row.seller_id,
    last_message_at: row.last_message_at.toISOString(),
    created_at: row.created_at.toISOString(),
    buyer_last_read_at: row.buyer_last_read_at?.toISOString() ?? null,
    seller_last_read_at: row.seller_last_read_at?.toISOString() ?? null,
  };
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

async function loadProfiles(
  ids: string[],
): Promise<Map<string, ConversationParticipant>> {
  const map = new Map<string, ConversationParticipant>();
  if (ids.length === 0) return map;
  const rows = await getPrisma().profile.findMany({
    where: { id: { in: unique(ids) } },
    select: { id: true, display_name: true, username: true, avatar_path: true },
  });
  for (const row of rows) map.set(row.id, row);
  return map;
}

async function loadListings(
  ids: string[],
): Promise<Map<string, ConversationListingRef>> {
  const map = new Map<string, ConversationListingRef>();
  if (ids.length === 0) return map;
  const rows = await getPrisma().listing.findMany({
    where: { id: { in: unique(ids) } },
    select: { id: true, title: true, slug: true, item_status: true },
  });
  for (const row of rows) {
    map.set(row.id, {
      id: row.id,
      title: row.title,
      slug: row.slug,
      item_status: row.item_status as ItemStatus,
    });
  }
  return map;
}

async function loadBlocks(userId: string): Promise<Block[]> {
  const rows = await getPrisma().block.findMany({
    where: { OR: [{ blocker_id: userId }, { blocked_id: userId }] },
    select: { id: true, blocker_id: true, blocked_id: true, created_at: true },
  });
  return rows.map((row) => ({
    ...row,
    created_at: row.created_at.toISOString(),
  }));
}

/** The signed-in user's inbox for the given role, newest activity first. */
export async function getInbox(
  role: ConversationRole,
): Promise<ConversationSummary[]> {
  const user = await requireUser(
    role === "seller" ? "/seller/messages" : "/messages",
  );
  if (!user) return [];

  const column = role === "buyer" ? "buyer_id" : "seller_id";
  const rows = await getPrisma().inquiry.findMany({
    where: { [column]: user.id },
    orderBy: { last_message_at: "desc" },
    take: messagingLimits.inboxPageSize,
  });

  if (rows.length === 0) return [];
  const conversations = rows.map(toConversation);
  const conversationIds = conversations.map((conversation) => conversation.id);
  const otherIds = conversations.map((conversation) =>
    role === "buyer" ? conversation.seller_id : conversation.buyer_id,
  );

  const [messageRows, blocks, profiles, listings] = await Promise.all([
    getPrisma().message.findMany({
      where: { inquiry_id: { in: conversationIds } },
      orderBy: { created_at: "desc" },
      take: messagingLimits.inboxMessagesScan,
    }),
    loadBlocks(user.id),
    loadProfiles(otherIds),
    loadListings(conversations.map((conversation) => conversation.listing_id)),
  ]);

  const messagesByConversation = new Map<string, Message[]>();
  for (const row of messageRows) {
    const message = toMessage(row);
    const list = messagesByConversation.get(message.inquiry_id);
    if (list) list.push(message);
    else messagesByConversation.set(message.inquiry_id, [message]);
  }

  const summaries: ConversationSummary[] = [];
  for (const conversation of conversations) {
    const summary = summariseConversation(
      conversation,
      messagesByConversation.get(conversation.id) ?? [],
      user.id,
      blocks,
    );
    if (!summary) continue;
    const otherId =
      role === "buyer" ? conversation.seller_id : conversation.buyer_id;
    summaries.push({
      ...summary,
      other: profiles.get(otherId) ?? null,
      listing: listings.get(conversation.listing_id) ?? null,
    });
  }

  summaries.sort((a, b) =>
    a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
  );
  return summaries;
}

export interface ConversationDetail {
  conversation: Conversation;
  role: ConversationRole;
  other: ConversationParticipant | null;
  listing: ConversationListingRef | null;
  messages: Message[];
  blockedByMe: boolean;
  blockedMe: boolean;
  canSend: boolean;
  blockReason: string | null;
}

/**
 * A single conversation the caller participates in. Returns null when the id is
 * unknown OR the caller is not a party, so an altered id can never expose
 * another user's thread.
 */
export async function getConversation(
  id: string,
): Promise<ConversationDetail | null> {
  const user = await requireUser("/messages");
  if (!user) return null;

  const row = await getPrisma().inquiry.findUnique({ where: { id } });
  if (!row) return null;
  const conversation = toConversation(row);
  const role = roleInConversation(conversation, user.id);
  if (!role) return null;

  const otherId =
    role === "buyer" ? conversation.seller_id : conversation.buyer_id;

  const [messageRows, blocks, profiles, listings] = await Promise.all([
    getPrisma().message.findMany({
      where: { inquiry_id: id },
      orderBy: { created_at: "desc" },
      take: messagingLimits.threadPageSize,
    }),
    loadBlocks(user.id),
    loadProfiles([otherId]),
    loadListings([conversation.listing_id]),
  ]);

  // Fetched newest-first for the limit; reverse for chronological display.
  const messages = messageRows.map(toMessage).reverse();

  const blockedByMe = blocks.some(
    (block) => block.blocker_id === user.id && block.blocked_id === otherId,
  );
  const blockedMe = blocks.some(
    (block) => block.blocker_id === otherId && block.blocked_id === user.id,
  );
  const guard = canSendMessage({ isParticipant: true, blockedByMe, blockedMe });

  return {
    conversation,
    role,
    other: profiles.get(otherId) ?? null,
    listing: listings.get(conversation.listing_id) ?? null,
    messages,
    blockedByMe,
    blockedMe,
    canSend: guard.ok,
    blockReason: guard.ok ? null : guard.reason,
  };
}

/** Total unread messages for a role, used for the seller rail badge. */
export async function getUnreadMessageCount(
  role: ConversationRole,
): Promise<number> {
  const inbox = await getInbox(role);
  return inbox.reduce((total, item) => total + item.unreadCount, 0);
}
