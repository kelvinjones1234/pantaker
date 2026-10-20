import { describe, expect, it } from "vitest";
import {
  conversationReportSchema,
  messageBodySchema,
  sendMessageSchema,
  startConversationSchema,
} from "@/lib/validation/messaging";
import { messagingLimits } from "@/config/site";

const LISTING_ID = "3f1c2a4e-5b6d-4e7f-8a90-1b2c3d4e5f60";
const INQUIRY_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("messageBodySchema", () => {
  it("accepts trimmed text", () => {
    expect(messageBodySchema.parse("  Is this still available?  ")).toBe("Is this still available?");
  });

  it("rejects empty and whitespace-only bodies", () => {
    expect(messageBodySchema.safeParse("").success).toBe(false);
    expect(messageBodySchema.safeParse("   ").success).toBe(false);
  });

  it("enforces the length cap", () => {
    expect(messageBodySchema.safeParse("a".repeat(messagingLimits.maxBodyLength)).success).toBe(true);
    expect(messageBodySchema.safeParse("a".repeat(messagingLimits.maxBodyLength + 1)).success).toBe(false);
  });
});

describe("startConversationSchema", () => {
  it("accepts a listing id with a first message", () => {
    const parsed = startConversationSchema.parse({
      listing_id: LISTING_ID,
      body: "Is the generator still available?",
    });
    expect(parsed.listing_id).toBe(LISTING_ID);
  });

  it("rejects a non-uuid listing and a too-short opener", () => {
    expect(startConversationSchema.safeParse({ listing_id: "nope", body: "hello there" }).success).toBe(false);
    expect(startConversationSchema.safeParse({ listing_id: LISTING_ID, body: "hi" }).success).toBe(false);
  });
});

describe("sendMessageSchema", () => {
  it("requires a uuid conversation and a non-empty body", () => {
    expect(sendMessageSchema.safeParse({ inquiry_id: INQUIRY_ID, body: "Sure" }).success).toBe(true);
    expect(sendMessageSchema.safeParse({ inquiry_id: "x", body: "Sure" }).success).toBe(false);
    expect(sendMessageSchema.safeParse({ inquiry_id: INQUIRY_ID, body: "" }).success).toBe(false);
  });
});

describe("conversationReportSchema", () => {
  it("requires a reason and a real explanation", () => {
    expect(
      conversationReportSchema.safeParse({
        inquiry_id: INQUIRY_ID,
        reason: "Spam or scam",
        details: "They asked me to pay outside the app.",
      }).success,
    ).toBe(true);
    expect(
      conversationReportSchema.safeParse({ inquiry_id: INQUIRY_ID, reason: "Spam or scam", details: "short" }).success,
    ).toBe(false);
  });

  it("does not accept a client-supplied reported user id (it is derived server-side)", () => {
    const parsed = conversationReportSchema.parse({
      inquiry_id: INQUIRY_ID,
      reason: "Spam or scam",
      details: "They asked me to pay outside the app.",
      reported_user_id: "11111111-1111-4111-8111-111111111111",
    });
    expect(parsed).not.toHaveProperty("reported_user_id");
  });
});
