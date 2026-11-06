import { describe, expect, it } from "vitest";
import {
  emailOtpVerifySchema,
  passwordLoginSchema,
  signupRequestSchema,
} from "@/lib/validation/auth";

describe("sign-up request", () => {
  const valid = {
    email: "buyer@example.com",
    password: "correct-horse",
    confirmPassword: "correct-horse",
  };

  it("accepts and trims a valid email", () => {
    const result = signupRequestSchema.safeParse({
      ...valid,
      email: "  buyer@example.com ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("buyer@example.com");
  });

  it("rejects a malformed email", () => {
    expect(signupRequestSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(
      signupRequestSchema.safeParse({
        ...valid,
        password: "short",
        confirmPassword: "short",
      }).success,
    ).toBe(false);
  });

  it("rejects mismatched passwords", () => {
    const result = signupRequestSchema.safeParse({
      ...valid,
      confirmPassword: "different",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Passwords do not match.",
      );
    }
  });
});

describe("password sign-in", () => {
  it("accepts an email and any non-empty password", () => {
    expect(
      passwordLoginSchema.safeParse({
        email: "buyer@example.com",
        password: "x",
      }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    expect(
      passwordLoginSchema.safeParse({ email: "buyer@example.com", password: "" }).success,
    ).toBe(false);
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
