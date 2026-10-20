import { describe, expect, it } from "vitest";
import { notificationPreferencesSchema } from "@/lib/validation/notifications";

describe("notificationPreferencesSchema", () => {
  it("maps checked boxes to true", () => {
    const parsed = notificationPreferencesSchema.parse({
      messages: "on",
      sale_updates: "on",
      listing_updates: "on",
    });
    expect(parsed).toEqual({ messages: true, sale_updates: true, listing_updates: true });
  });

  it("treats absent fields as off", () => {
    const parsed = notificationPreferencesSchema.parse({});
    expect(parsed).toEqual({ messages: false, sale_updates: false, listing_updates: false });
  });

  it("keeps a partial selection independent", () => {
    const parsed = notificationPreferencesSchema.parse({ messages: "on" });
    expect(parsed).toEqual({ messages: true, sale_updates: false, listing_updates: false });
  });

  it("rejects a non-checkbox truthy-looking value", () => {
    const parsed = notificationPreferencesSchema.parse({ messages: "yes-please" });
    expect(parsed.messages).toBe(false);
  });

  it("accepts real booleans for programmatic callers", () => {
    const parsed = notificationPreferencesSchema.parse({
      messages: true,
      sale_updates: false,
      listing_updates: true,
    });
    expect(parsed).toEqual({ messages: true, sale_updates: false, listing_updates: true });
  });
});
