import type {
  Block,
  Conversation,
  ConversationRole,
  ConversationSummary,
  Message,
} from "@/types/marketplace";

/**
 * Pure messaging rules. Kept free of Supabase/Next so the security-critical
 * decisions (who may read or send, unread counts, block checks, rate limits) are
 * unit-testable and shared by the data layer and the server actions.
 *
 * The user id passed in MUST come from the server session — never the browser.
 */

/** The signed-in user's role in a conversation, or null if they are not a party. */
export function roleInConversation(
  conversation: Pick<Conversation, "buyer_id" | "seller_id"> | null | undefined,
  userId: string | null | undefined,
): ConversationRole | null {
  if (!conversation || !userId) return null;
  if (conversation.buyer_id === userId) return "buyer";
  if (conversation.seller_id === userId) return "seller";
  return null;
}

export function isParticipant(
  conversation: Pick<Conversation, "buyer_id" | "seller_id"> | null | undefined,
  userId: string | null | undefined,
): boolean {
  return roleInConversation(conversation, userId) !== null;
}

/** The other party's user id, or null when the caller is not a participant. */
export function otherPartyId(
  conversation: Pick<Conversation, "buyer_id" | "seller_id"> | null | undefined,
  userId: string | null | undefined,
): string | null {
  const role = roleInConversation(conversation, userId);
  if (!conversation || !role) return null;
  return role === "buyer" ? conversation.seller_id : conversation.buyer_id;
}

/** The read marker for the given role. */
export function lastReadAt(
  conversation: Pick<Conversation, "buyer_last_read_at" | "seller_last_read_at">,
  role: ConversationRole,
): string | null {
  return role === "buyer" ? conversation.buyer_last_read_at : conversation.seller_last_read_at;
}

/**
 * How many messages the user has not read: messages from the other party sent
 * after the user's last-read marker. ISO timestamps compare correctly as strings.
 */
export function countUnread(
  messages: Pick<Message, "sender_id" | "created_at">[],
  userId: string,
  readAt: string | null,
): number {
  return messages.filter(
    (message) =>
      message.sender_id !== userId && (readAt === null || message.created_at > readAt),
  ).length;
}

/** The most recent message in an unsorted list, or null. */
export function latestMessage<T extends Pick<Message, "created_at">>(messages: T[]): T | null {
  let latest: T | null = null;
  for (const message of messages) {
    if (!latest || message.created_at > latest.created_at) latest = message;
  }
  return latest;
}

/** Whether sending is allowed, with a plain-language reason when it is not. */
export function canSendMessage(state: {
  isParticipant: boolean;
  blockedByMe: boolean;
  blockedMe: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!state.isParticipant) return { ok: false, reason: "You're not part of this conversation." };
  if (state.blockedByMe) return { ok: false, reason: "You blocked this person. Unblock them to reply." };
  if (state.blockedMe) return { ok: false, reason: "You can't reply to this conversation." };
  return { ok: true };
}

/** A simple sliding-window guard: true when one more action stays within `max`. */
export function withinLimit(recentCount: number, max: number): boolean {
  return recentCount < max;
}

/**
 * Build an inbox row from a conversation and its messages. Returns null when the
 * caller is not a participant, so a stray id can never produce another user's
 * thread.
 */
export function summariseConversation(
  conversation: Conversation,
  messages: Message[],
  userId: string,
  blocks: Pick<Block, "blocker_id" | "blocked_id">[],
): ConversationSummary | null {
  const role = roleInConversation(conversation, userId);
  if (!role) return null;

  const other = role === "buyer" ? conversation.seller_id : conversation.buyer_id;
  return {
    id: conversation.id,
    role,
    other: null, // filled in by the query once the profile is loaded
    listing: null,
    lastMessage: latestMessage(messages),
    unreadCount: countUnread(messages, userId, lastReadAt(conversation, role)),
    updatedAt: conversation.last_message_at,
    blockedByMe: blocks.some(
      (block) => block.blocker_id === userId && block.blocked_id === other,
    ),
    blockedMe: blocks.some(
      (block) => block.blocker_id === other && block.blocked_id === userId,
    ),
  };
}
