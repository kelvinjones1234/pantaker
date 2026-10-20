import { describe, expect, it } from "vitest";
import {
  NOTIFICATION_META,
  NOTIFICATION_TYPES,
  countUnread,
  isNotificationType,
  isUnread,
  messageDedupeKey,
  preferenceKeyForType,
  saleDedupeKey,
  sortByNewest,
  splitByRead,
} from "@/features/notifications/rules";
import type { AppNotification } from "@/types/marketplace";

function note(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: "n1",
    user_id: "user-1",
    type: "new_message",
    title: "New message",
    body: null,
    href: "/messages/x",
    listing_id: null,
    conversation_id: null,
    sale_id: null,
    actor_id: null,
    read_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("notification types", () => {
  it("recognises every declared type and rejects anything else", () => {
    for (const type of NOTIFICATION_TYPES) expect(isNotificationType(type)).toBe(true);
    expect(isNotificationType("promo")).toBe(false);
    expect(isNotificationType(42)).toBe(false);
    expect(isNotificationType(null)).toBe(false);
  });

  it("maps each type to its governing preference, account events excepted", () => {
    expect(preferenceKeyForType("new_message")).toBe("messages");
    expect(preferenceKeyForType("sale_status_changed")).toBe("sale_updates");
    expect(preferenceKeyForType("listing_published")).toBe("listing_updates");
    expect(preferenceKeyForType("listing_rejected")).toBe("listing_updates");
    expect(preferenceKeyForType("account_email_change")).toBeNull();
  });

  it("has metadata for every declared type and no stray ones", () => {
    expect(Object.keys(NOTIFICATION_META).sort()).toEqual([...NOTIFICATION_TYPES].sort());
  });
});

describe("read state", () => {
  it("treats a null read_at as unread and a timestamp as read", () => {
    expect(isUnread({ read_at: null })).toBe(true);
    expect(isUnread({ read_at: "2026-01-02T00:00:00.000Z" })).toBe(false);
  });

  it("counts only unread notifications", () => {
    expect(
      countUnread([
        { read_at: null },
        { read_at: "2026-01-02T00:00:00.000Z" },
        { read_at: null },
      ]),
    ).toBe(2);
  });
});

describe("ordering and grouping", () => {
  it("sorts newest first without mutating the input", () => {
    const input = [
      note({ id: "old", created_at: "2026-01-01T00:00:00.000Z" }),
      note({ id: "new", created_at: "2026-03-01T00:00:00.000Z" }),
      note({ id: "mid", created_at: "2026-02-01T00:00:00.000Z" }),
    ];
    const sorted = sortByNewest(input);
    expect(sorted.map((n) => n.id)).toEqual(["new", "mid", "old"]);
    expect(input.map((n) => n.id)).toEqual(["old", "new", "mid"]);
  });

  it("splits into unread then read, both newest first", () => {
    const { unread, read } = splitByRead([
      note({ id: "r1", read_at: "2026-01-05T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" }),
      note({ id: "u1", read_at: null, created_at: "2026-01-02T00:00:00.000Z" }),
      note({ id: "u2", read_at: null, created_at: "2026-01-03T00:00:00.000Z" }),
    ]);
    expect(unread.map((n) => n.id)).toEqual(["u2", "u1"]);
    expect(read.map((n) => n.id)).toEqual(["r1"]);
  });
});

describe("dedupe keys mirror the SQL", () => {
  it("keys a message on its id", () => {
    expect(messageDedupeKey("m-123")).toBe("message:m-123");
  });

  it("keys a sale on sale id and status", () => {
    expect(saleDedupeKey("s-1", "reserved")).toBe("sale:s-1:reserved");
    expect(saleDedupeKey("s-1", "completed")).not.toBe(saleDedupeKey("s-1", "reserved"));
  });
});
