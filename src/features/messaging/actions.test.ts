import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireUserMock,
  revalidateMock,
  checkWriteMock,
  emitMock,
  configured,
  prisma,
  holder,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(async (_next?: string) => ({
    id: "user-buyer",
    email: "buyer@example.com",
  })),
  revalidateMock: vi.fn(),
  checkWriteMock: vi.fn(async (): Promise<{ ok: boolean; error?: string }> => ({
    ok: true,
  })),
  emitMock: vi.fn(async (..._args: unknown[]) => undefined),
  configured: { value: true },
  prisma: {
    listing: { findUnique: vi.fn(async () => null) },
    block: {
      findFirst: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    inquiry: {
      count: vi.fn(async () => 0),
      findUnique: vi.fn(async () => null),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async () => ({ id: "conv-1" })),
      update: vi.fn(async () => ({})),
    },
    message: {
      create: vi.fn(async () => ({})),
      count: vi.fn(async () => 0),
      findMany: vi.fn(async () => []),
    },
    report: { create: vi.fn(async () => ({})) },
  } as any,
  holder: {
    inquiryUpdates: [] as Array<{ id: string; data: Record<string, unknown> }>,
    messageInserts: [] as Array<Record<string, unknown>>,
    inquiryInserts: [] as Array<Record<string, unknown>>,
    blockUpserts: [] as Array<unknown>,
    blockDeletes: [] as Array<unknown>,
    reportInserts: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidateMock }));
vi.mock("@/features/auth/authorization", () => ({
  requireUserForAction: (next?: string) => requireUserMock(next),
}));
vi.mock("@/features/accounts/access", () => ({
  checkAccountCanWrite: () => checkWriteMock(),
}));
vi.mock("@/features/notifications/emit", () => ({
  emitNewMessageNotification: (...args: unknown[]) => emitMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => prisma,
  isPrismaConfigured: () => configured.value,
}));
vi.mock("@/lib/db/context", () => ({
  withUserContext: async (_user: unknown, work: (tx: unknown) => unknown) =>
    work({
      inquiry: {
        findFirst: (...args: unknown[]) =>
          prisma.inquiry.findFirst(...(args as [])),
        create: async (args: { data: Record<string, unknown> }) => {
          holder.inquiryInserts.push(args.data);
          return prisma.inquiry.create();
        },
        update: async (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          holder.inquiryUpdates.push({ id: args.where.id, data: args.data });
          return {};
        },
      },
      message: {
        create: async (args: { data: Record<string, unknown> }) => {
          holder.messageInserts.push(args.data);
          return prisma.message.create();
        },
      },
    }),
}));

import {
  blockUserAction,
  markConversationReadAction,
  reportConversationAction,
  sendMessageAction,
  startConversationAction,
  unblockUserAction,
} from "@/features/messaging/actions";
import type { MessageActionResult } from "@/features/messaging/actions";

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function errorOf(res: MessageActionResult): string | undefined {
  return res.ok ? undefined : res.error;
}
function errorsOf(
  res: MessageActionResult,
): Record<string, string[] | undefined> {
  return res.ok ? {} : (res.errors ?? {});
}

const BUYER = "user-buyer";
const SELLER = "user-seller";
const LISTING_ID = "3f1c2a4e-5b6d-4e7f-8a90-1b2c3d4e5f60";
const INQUIRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

const conversation = {
  id: INQUIRY_ID,
  buyer_id: BUYER,
  seller_id: SELLER,
  listing_id: LISTING_ID,
};

beforeEach(() => {
  configured.value = true;
  requireUserMock.mockResolvedValue({ id: BUYER, email: "buyer@example.com" });
  checkWriteMock.mockResolvedValue({ ok: true });
  prisma.listing.findUnique.mockResolvedValue({
    seller_id: SELLER,
    item_status: "published",
  });
  prisma.block.findFirst.mockResolvedValue(null);
  prisma.inquiry.count.mockResolvedValue(0);
  prisma.inquiry.findUnique.mockResolvedValue(conversation);
  prisma.inquiry.findFirst.mockResolvedValue(null);
  prisma.inquiry.create.mockResolvedValue({ id: "conv-1" });
  prisma.message.count.mockResolvedValue(0);
  prisma.message.create.mockResolvedValue({
    id: "m-1",
    inquiry_id: INQUIRY_ID,
    sender_id: BUYER,
    body: "hello there",
    created_at: new Date("2026-01-01T00:00:00Z"),
  });
  holder.inquiryUpdates = [];
  holder.messageInserts = [];
  holder.inquiryInserts = [];
  holder.blockUpserts = [];
  holder.blockDeletes = [];
  holder.reportInserts = [];
  prisma.block.upsert.mockImplementation(
    async (args: { create: Record<string, unknown> }) => {
      holder.blockUpserts.push(args.create);
      return {};
    },
  );
  prisma.block.deleteMany.mockImplementation(
    async (args: { where: Record<string, unknown> }) => {
      holder.blockDeletes.push(args.where);
      return { count: 1 };
    },
  );
  prisma.report.create.mockImplementation(
    async (args: { data: Record<string, unknown> }) => {
      holder.reportInserts.push(args.data);
      return {};
    },
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("startConversationAction", () => {
  it("denies a restricted account before any query", async () => {
    checkWriteMock.mockResolvedValueOnce({
      ok: false,
      error: "Your account is restricted.",
    });
    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "hi there" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/restricted/i);
    expect(prisma.listing.findUnique).not.toHaveBeenCalled();
  });

  it("redirects an anonymous caller before any query", async () => {
    requireUserMock.mockImplementationOnce(async () => {
      throw new Error("NEXT_REDIRECT:/login");
    });
    await expect(
      startConversationAction(
        formData({ listing_id: LISTING_ID, body: "hello there" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(prisma.listing.findUnique).not.toHaveBeenCalled();
  });

  it("refuses to message your own listing", async () => {
    prisma.listing.findUnique.mockResolvedValue({
      seller_id: BUYER,
      item_status: "published",
    });
    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "hello there" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/own listing/i);
    expect(holder.inquiryInserts).toHaveLength(0);
  });

  it("refuses an archived listing", async () => {
    prisma.listing.findUnique.mockResolvedValue({
      seller_id: SELLER,
      item_status: "archived",
    });
    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "hello there" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/no longer available/i);
  });

  it("refuses when either party has blocked the other", async () => {
    prisma.block.findFirst.mockResolvedValue({ id: "block-1" });
    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "hello there" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/can't start/i);
  });

  it("rate-limits new conversations per hour", async () => {
    prisma.inquiry.count.mockResolvedValue(10);
    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "hello there" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/too many conversations/i);
  });

  it("creates the conversation and first message for the session buyer", async () => {
    prisma.inquiry.create.mockResolvedValue({ id: "conv-1" });
    prisma.message.create.mockResolvedValue({
      id: "m-1",
      inquiry_id: "conv-1",
      sender_id: BUYER,
      body: "Is this available?",
      created_at: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "Is this available?" }),
    );
    expect(res).toMatchObject({ ok: true, id: "conv-1" });
    expect(holder.inquiryInserts[0]).toMatchObject({
      listing_id: LISTING_ID,
      buyer_id: BUYER,
      seller_id: SELLER,
      message: "Is this available?",
    });
    expect(holder.messageInserts[0]).toMatchObject({
      inquiry_id: "conv-1",
      sender_id: BUYER,
      body: "Is this available?",
    });
    expect(emitMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: BUYER }),
      "conv-1",
      "m-1",
    );
  });

  it("reuses an existing thread instead of creating a duplicate", async () => {
    prisma.inquiry.findFirst.mockResolvedValue({ id: "conv-existing" });
    prisma.message.create.mockResolvedValue({
      id: "m-2",
      inquiry_id: "conv-existing",
      sender_id: BUYER,
      body: "Following up",
      created_at: new Date("2026-01-01T00:00:00Z"),
    });

    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "Following up" }),
    );
    expect(res).toMatchObject({ ok: true, id: "conv-existing" });
    expect(holder.inquiryInserts).toHaveLength(0);
    expect(holder.messageInserts).toHaveLength(1);
  });

  it("rejects a too-short opener before any query", async () => {
    const res = await startConversationAction(
      formData({ listing_id: LISTING_ID, body: "hi" }),
    );
    expect(res.ok).toBe(false);
    expect(errorsOf(res).body).toBeTruthy();
    expect(prisma.listing.findUnique).not.toHaveBeenCalled();
  });
});

describe("sendMessageAction", () => {
  it("denies a restricted account before any query", async () => {
    checkWriteMock.mockResolvedValueOnce({
      ok: false,
      error: "Your account is restricted.",
    });
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "hello" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/restricted/i);
    expect(prisma.inquiry.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a non-participant (altered conversation id)", async () => {
    prisma.inquiry.findUnique.mockResolvedValue({
      id: INQUIRY_ID,
      buyer_id: "x",
      seller_id: "y",
    });
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "hello" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/not part/i);
    expect(holder.messageInserts).toHaveLength(0);
  });

  it("rejects an unknown conversation id", async () => {
    prisma.inquiry.findUnique.mockResolvedValue(null);
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "hello" }),
    );
    expect(res.ok).toBe(false);
    expect(holder.messageInserts).toHaveLength(0);
  });

  it("refuses to send when blocked", async () => {
    prisma.block.findFirst.mockResolvedValue({ id: "block-1" });
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "hello" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/blocked|can't reply/i);
    expect(holder.messageInserts).toHaveLength(0);
  });

  it("rate-limits a burst of messages", async () => {
    prisma.message.count.mockResolvedValue(20);
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "hello" }),
    );
    expect(res.ok).toBe(false);
    expect(errorOf(res)).toMatch(/too quickly/i);
    expect(holder.messageInserts).toHaveLength(0);
  });

  it("persists a message from the session user and bumps thread activity", async () => {
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "hello" }),
    );
    expect(res.ok).toBe(true);
    expect(res.ok && res.message?.id).toBe("m-1");
    expect(holder.messageInserts[0]).toMatchObject({
      inquiry_id: INQUIRY_ID,
      sender_id: BUYER,
      body: "hello",
    });
    expect(holder.inquiryUpdates[0]?.id).toBe(INQUIRY_ID);
    expect(holder.inquiryUpdates[0]?.data).toHaveProperty("last_message_at");
    expect(emitMock).toHaveBeenCalledWith(
      expect.any(Object),
      INQUIRY_ID,
      "m-1",
    );
  });

  it("rejects an empty message before any query", async () => {
    const res = await sendMessageAction(
      formData({ inquiry_id: INQUIRY_ID, body: "   " }),
    );
    expect(res.ok).toBe(false);
    expect(prisma.inquiry.findUnique).not.toHaveBeenCalled();
  });
});

describe("markConversationReadAction", () => {
  it("sets the buyer read marker for a buyer", async () => {
    const res = await markConversationReadAction(INQUIRY_ID);
    expect(res.ok).toBe(true);
    expect(holder.inquiryUpdates[0]?.data).toHaveProperty("buyer_last_read_at");
  });

  it("sets the seller read marker for a seller", async () => {
    requireUserMock.mockResolvedValue({
      id: SELLER,
      email: "seller@example.com",
    });
    const res = await markConversationReadAction(INQUIRY_ID);
    expect(res.ok).toBe(true);
    expect(holder.inquiryUpdates[0]?.data).toHaveProperty(
      "seller_last_read_at",
    );
  });

  it("does nothing for a non-participant", async () => {
    prisma.inquiry.findUnique.mockResolvedValue({
      id: INQUIRY_ID,
      buyer_id: "x",
      seller_id: "y",
    });
    const res = await markConversationReadAction(INQUIRY_ID);
    expect(res.ok).toBe(false);
    expect(holder.inquiryUpdates).toHaveLength(0);
  });
});

describe("block / unblock", () => {
  it("blocks the other participant, deriving them from the conversation", async () => {
    const res = await blockUserAction(formData({ inquiry_id: INQUIRY_ID }));
    expect(res.ok).toBe(true);
    expect(holder.blockUpserts[0]).toMatchObject({
      blocker_id: BUYER,
      blocked_id: SELLER,
    });
  });

  it("refuses to block when not a participant", async () => {
    prisma.inquiry.findUnique.mockResolvedValue({
      id: INQUIRY_ID,
      buyer_id: "x",
      seller_id: "y",
      listing_id: LISTING_ID,
    });
    const res = await blockUserAction(formData({ inquiry_id: INQUIRY_ID }));
    expect(res.ok).toBe(false);
    expect(holder.blockUpserts).toHaveLength(0);
  });

  it("unblocks by deleting the caller's block of the other party", async () => {
    const res = await unblockUserAction(formData({ inquiry_id: INQUIRY_ID }));
    expect(res.ok).toBe(true);
    expect(holder.blockDeletes[0]).toMatchObject({
      blocker_id: BUYER,
      blocked_id: SELLER,
    });
  });
});

describe("reportConversationAction", () => {
  it("files a report against the other participant, derived server-side", async () => {
    const res = await reportConversationAction(
      formData({
        inquiry_id: INQUIRY_ID,
        reason: "Spam or scam",
        details: "Asked me to pay outside the app.",
      }),
    );
    expect(res.ok).toBe(true);
    expect(holder.reportInserts[0]).toMatchObject({
      reporter_id: BUYER,
      reported_user_id: SELLER,
      conversation_id: INQUIRY_ID,
      listing_id: LISTING_ID,
    });
  });

  it("rejects a report with no real explanation", async () => {
    const res = await reportConversationAction(
      formData({
        inquiry_id: INQUIRY_ID,
        reason: "Spam or scam",
        details: "short",
      }),
    );
    expect(res.ok).toBe(false);
    expect(prisma.inquiry.findUnique).not.toHaveBeenCalled();
  });
});
