import { describe, expect, it } from "vitest";
import {
  canDelete,
  canEdit,
  canTransition,
  isReactivatable,
  transitionsFrom,
} from "@/features/listings/lifecycle";

describe("seller listing status transitions", () => {
  it("lets a draft be submitted for review but never self-published", () => {
    expect(canTransition("draft", "pending_review")).toBe(true);
    expect(canTransition("draft", "published")).toBe(false);
    expect(canTransition("draft", "sold")).toBe(false);
  });

  it("lets a pending listing be withdrawn but not self-published", () => {
    expect(canTransition("pending_review", "draft")).toBe(true);
    expect(canTransition("pending_review", "published")).toBe(false);
    expect(canTransition("pending_review", "sold")).toBe(false);
  });

  it("lets a rejected listing be resubmitted", () => {
    expect(canTransition("rejected", "pending_review")).toBe(true);
    expect(canTransition("rejected", "published")).toBe(false);
  });

  it("lets a live listing be marked sold or unavailable", () => {
    expect(canTransition("published", "sold")).toBe(true);
    expect(canTransition("published", "archived")).toBe(true);
    expect(canTransition("published", "draft")).toBe(false);
  });

  it("lets sold and archived listings be reactivated", () => {
    expect(canTransition("sold", "published")).toBe(true);
    expect(canTransition("archived", "published")).toBe(true);
    expect(canTransition("sold", "draft")).toBe(false);
  });

  it("exposes a transition list per status", () => {
    expect(transitionsFrom("published").map((t) => t.to)).toEqual(["sold", "archived"]);
    expect(transitionsFrom("draft").map((t) => t.to)).toEqual(["pending_review"]);
  });
});

describe("deletion eligibility", () => {
  it("protects live listings from direct deletion", () => {
    expect(canDelete("published")).toBe(false);
  });

  it("allows drafts, rejected, archived, sold, and pending listings", () => {
    for (const status of ["draft", "pending_review", "rejected", "archived", "sold"] as const) {
      expect(canDelete(status)).toBe(true);
    }
  });
});

describe("edit + reactivation guards", () => {
  it("does not allow editing an archived listing directly", () => {
    expect(canEdit("archived")).toBe(false);
    expect(canEdit("published")).toBe(true);
  });

  it("only reactivates non-expired listings", () => {
    expect(isReactivatable(null)).toBe(true);
    expect(isReactivatable(new Date(Date.now() + 86_400_000).toISOString())).toBe(true);
    expect(isReactivatable(new Date(Date.now() - 86_400_000).toISOString())).toBe(false);
  });
});
