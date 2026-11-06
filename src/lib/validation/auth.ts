import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use 128 characters or fewer.");

/** Sign-up — email, password, and confirmation. A code is emailed afterwards. */
export const signupRequestSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

/** Sign-in — email and password only. */
export const passwordLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

/** Verify the 6-digit code that was emailed during sign-up. */
export const emailOtpVerifySchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
});

export type SignupRequestInput = z.infer<typeof signupRequestSchema>;
export type PasswordLoginInput = z.infer<typeof passwordLoginSchema>;
export type EmailOtpVerifyInput = z.infer<typeof emailOtpVerifySchema>;
