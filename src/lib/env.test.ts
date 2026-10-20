import { afterEach, describe, expect, it, vi } from "vitest";
import { productionConfigError } from "@/lib/env";

const KEYS = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
  "EMAIL_SERVER_HOST",
  "EMAIL_SERVER_USER",
  "EMAIL_SERVER_PASSWORD",
  "EMAIL_FROM",
] as const;

function setProductionEnv(siteUrl = "https://pantaker.example") {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("DATABASE_URL", "postgresql://user:pass@db.example.com:5432/pantaker");
  vi.stubEnv("AUTH_SECRET", "test-secret");
  vi.stubEnv("EMAIL_SERVER_HOST", "smtp.example.com");
  vi.stubEnv("EMAIL_SERVER_USER", "mailer@pantaker.example");
  vi.stubEnv("EMAIL_SERVER_PASSWORD", "app-password");
  vi.stubEnv("EMAIL_FROM", "Pantaker <hello@pantaker.example>");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", siteUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPPORT_EMAIL", "support@pantaker.example");
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const key of KEYS) vi.stubEnv(key, "");
});

describe("productionConfigError", () => {
  it("does not block development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(productionConfigError()).toBeNull();
  });

  it("blocks production when required values are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(productionConfigError()).toMatch(/Missing/);
  });

  it("blocks a localhost canonical URL in production", () => {
    setProductionEnv("http://localhost:3000");
    expect(productionConfigError()).toMatch(/NEXT_PUBLIC_SITE_URL/);
  });

  it("accepts a fully configured production environment", () => {
    setProductionEnv();
    expect(productionConfigError()).toBeNull();
  });
});
