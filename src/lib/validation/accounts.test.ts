import { describe, expect, it } from "vitest";
import { accountStatusSchema } from "@/lib/validation/accounts";

const UUID = "3f1c2a4e-5b6d-4e7f-8a90-1b2c3d4e5f60";

describe("accountStatusSchema", () => {
  it("accepts a valid status change with a reason", () => {
    const result = accountStatusSchema.safeParse({
      user_id: UUID,
      status: "suspended",
      reason: "Repeated spam after warnings",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid account", () => {
    const result = accountStatusSchema.safeParse({
      user_id: "nope",
      status: "restricted",
      reason: "Repeated spam after warnings",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status", () => {
    const result = accountStatusSchema.safeParse({
      user_id: UUID,
      status: "banned",
      reason: "Repeated spam after warnings",
    });
    expect(result.success).toBe(false);
  });

  it("requires a reason of at least five characters", () => {
    const result = accountStatusSchema.safeParse({
      user_id: UUID,
      status: "restricted",
      reason: "spam",
    });
    expect(result.success).toBe(false);
  });
});
