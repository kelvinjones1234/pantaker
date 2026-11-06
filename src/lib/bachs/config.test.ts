import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isBachsConfigured } from "@/lib/bachs/config";

const KEYS = [
  "BACHS_SECRET_KEY",
  "BACHS_WEBHOOK_SECRET",
  "BACHS_API_BASE_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

let original: Record<string, string | undefined>;

function setEnv(values: Partial<Record<(typeof KEYS)[number], string>>) {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
}

beforeEach(() => {
  original = {};
  for (const key of KEYS) {
    original[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (original[key] === undefined) delete process.env[key];
    else process.env[key] = original[key];
  }
});

describe("isBachsConfigured", () => {
  it("is false when the API key is missing", () => {
    setEnv({
      BACHS_WEBHOOK_SECRET: "whsec",
      NEXT_PUBLIC_SITE_URL: "https://pantaker.example",
    });
    expect(isBachsConfigured()).toBe(false);
  });

  it("is false when the webhook secret is missing", () => {
    setEnv({
      BACHS_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_SITE_URL: "https://pantaker.example",
    });
    expect(isBachsConfigured()).toBe(false);
  });

  it("is false when the public URL is missing or local", () => {
    setEnv({
      BACHS_SECRET_KEY: "sk_test_123",
      BACHS_WEBHOOK_SECRET: "whsec",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
    expect(isBachsConfigured()).toBe(false);
  });

  it("is true only when checkout and webhooks can work end to end", () => {
    setEnv({
      BACHS_SECRET_KEY: "sk_test_123",
      BACHS_WEBHOOK_SECRET: "whsec",
      NEXT_PUBLIC_SITE_URL: "https://pantaker.example",
    });
    expect(isBachsConfigured()).toBe(true);
  });
});
