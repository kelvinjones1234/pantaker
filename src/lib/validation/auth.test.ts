import { describe, expect, it } from "vitest";
import { emailOtpRequestSchema, emailOtpVerifySchema } from "@/lib/validation/auth";

describe("email OTP request", () => {
  it("accepts and trims a valid email", () => {
    const result = emailOtpRequestSchema.safeParse({ email: "  buyer@example.com " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("buyer@example.com");
  });

  it("rejects a malformed email", () => {
    expect(emailOtpRequestSchema.safeParse({ email: "not-an-email" }).success).toBe(false);
  });

  it("rejects an empty email", () => {
    expect(emailOtpRequestSchema.safeParse({ email: "" }).success).toBe(false);
  });
});

describe("email OTP verification", () => {
  const email = "buyer@example.com";

  it("accepts a 6-digit code", () => {
    expect(emailOtpVerifySchema.safeParse({ email, token: "123456" }).success).toBe(true);
  });

  it("rejects a code that is not 6 digits", () => {
    expect(emailOtpVerifySchema.safeParse({ email, token: "12345" }).success).toBe(false);
    expect(emailOtpVerifySchema.safeParse({ email, token: "1234567" }).success).toBe(false);
  });

  it("rejects a non-numeric code", () => {
    expect(emailOtpVerifySchema.safeParse({ email, token: "abc123" }).success).toBe(false);
  });

  it("still validates the email", () => {
    expect(emailOtpVerifySchema.safeParse({ email: "bad", token: "123456" }).success).toBe(false);
  });
});
