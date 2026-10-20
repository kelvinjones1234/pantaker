import { describe, expect, it } from "vitest";
import {
  canSendMessage,
  countUnread,
  isParticipant,
  lastReadAt,
  latestMessage,
  otherPartyId,
  roleInConversation,
  summariseConversation,
  withinLimit,
} from "@/features/messaging/rules";
import type { Conversation, Message } from "@/types/marketplace";

const BUYER = "user-buyer";
const SELLER = "user-seller";
const STRANGER = "user-stranger";

const conversation: Conversation = {
  id: "conv-1",
  listing_id: "listing-1",
  buyer_id: BUYER,
  seller_id: SELLER,
  last_message_at: "2026-01-01T10:05:00.000Z",
  created_at: "2026-01-01T10:00:00.000Z",
  buyer_last_read_at: "2026-01-01T10:01:00.000Z",
  seller_last_read_at: null,
};

function message(id: string, sender: string, createdAt: string): Message {
  return { id, inquiry_id: "conv-1", sender_id: sender, body: `msg ${id}`, created_at: createdAt };
}

const messages: Message[] = [
  message("m1", BUYER, "2026-01-01T10:00:00.000Z"),
  message("m2", SELLER, "2026-01-01T10:00:30.000Z"),
  message("m3", SELLER, "2026-01-01T10:02:00.000Z"),
  message("m4", BUYER, "2026-01-01T10:05:00.000Z"),
];

describe("participant isolation", () => {
  it("assigns roles only to the two parties", () => {
    expect(roleInConversation(conversation, BUYER)).toBe("buyer");
    expect(roleInConversation(conversation, SELLER)).toBe("seller");
    expect(roleInConversation(conversation, STRANGER)).toBeNull();
    expect(roleInConversation(conversation, null)).toBeNull();
    expect(roleInConversation(null, BUYER)).toBeNull();
  });

  it("exposes the other party only to participants", () => {
    expect(otherPartyId(conversation, BUYER)).toBe(SELLER);
    expect(otherPartyId(conversation, SELLER)).toBe(BUYER);
    expect(otherPartyId(conversation, STRANGER)).toBeNull();
  });

  it("reports participation correctly", () => {
    expect(isParticipant(conversation, BUYER)).toBe(true);
    expect(isParticipant(conversation, STRANGER)).toBe(false);
  });
});

describe("unread counts", () => {
  it("counts messages from the other party after the read marker", () => {
    // Buyer read up to 10:01: m2 (10:00:30) is read, m3 (10:02) is unread.
    expect(countUnread(messages, BUYER, conversation.buyer_last_read_at)).toBe(1);
  });

  it("counts every other-party message when nothing has been read", () => {
    expect(countUnread(messages, SELLER, null)).toBe(2); // the two buyer messages
  });

  it("is zero once everything is read", () => {
    expect(countUnread(messages, BUYER, "2026-01-01T11:00:00.000Z")).toBe(0);
  });

  it("never counts the user's own messages", () => {
    expect(countUnread(messages, BUYER, null)).toBe(2);
  });
});

describe("latest message", () => {
  it("returns the newest regardless of order", () => {
    expect(latestMessage([...messages].reverse())?.id).toBe("m4");
    expect(latestMessage([])).toBeNull();
  });
});

describe("send guard", () => {
  it("allows a participant with no blocks", () => {
    expect(canSendMessage({ isParticipant: true, blockedByMe: false, blockedMe: false })).toEqual({ ok: true });
  });

  it("blocks non-participants and blocked parties", () => {
    expect(canSendMessage({ isParticipant: false, blockedByMe: false, blockedMe: false }).ok).toBe(false);
    expect(canSendMessage({ isParticipant: true, blockedByMe: true, blockedMe: false }).ok).toBe(false);
    expect(canSendMessage({ isParticipant: true, blockedByMe: false, blockedMe: true }).ok).toBe(false);
  });
});

describe("rate limiting", () => {
  it("permits only counts strictly under the maximum", () => {
    expect(withinLimit(19, 20)).toBe(true);
    expect(withinLimit(20, 20)).toBe(false);
    expect(withinLimit(21, 20)).toBe(false);
  });
});

describe("conversation summary", () => {
  it("fills unread count, last message and block flags for a participant", () => {
    const summary = summariseConversation(conversation, messages, BUYER, [
      { blocker_id: BUYER, blocked_id: SELLER },
    ]);
    expect(summary).not.toBeNull();
    expect(summary?.role).toBe("buyer");
    expect(summary?.unreadCount).toBe(1);
    expect(summary?.lastMessage?.id).toBe("m4");
    expect(summary?.updatedAt).toBe(conversation.last_message_at);
    expect(summary?.blockedByMe).toBe(true);
    expect(summary?.blockedMe).toBe(false);
  });

  it("detects when the other party has blocked me", () => {
    const summary = summariseConversation(conversation, messages, SELLER, [
      { blocker_id: BUYER, blocked_id: SELLER },
    ]);
    expect(summary?.blockedMe).toBe(true);
    expect(summary?.blockedByMe).toBe(false);
  });

  it("returns null for a non-participant", () => {
    expect(summariseConversation(conversation, messages, STRANGER, [])).toBeNull();
  });

  it("reports the correct read marker per role", () => {
    expect(lastReadAt(conversation, "buyer")).toBe(conversation.buyer_last_read_at);
    expect(lastReadAt(conversation, "seller")).toBeNull();
  });
});
