import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.");

/** Step 1 — request a one-time code by email. */
export const emailOtpRequestSchema = z.object({
  email: emailSchema,
});

/** Step 2 — verify the 6-digit code that was emailed. */
export const emailOtpVerifySchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export type EmailOtpRequestInput = z.infer<typeof emailOtpRequestSchema>;
export type EmailOtpVerifyInput = z.infer<typeof emailOtpVerifySchema>;
