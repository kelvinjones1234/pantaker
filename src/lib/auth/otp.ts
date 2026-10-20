import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { User } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_SENDS_PER_HOUR = 5;
const MAX_SENDS_PER_IP_PER_HOUR = 20;
const MAX_ATTEMPTS = 5;

export type IssueCodeResult =
  | { ok: true; id: string; code: string; expiresAt: Date }
  | { ok: false; reason: "cooldown" | "rate_limited" };

export type VerifyCodeResult =
  | { ok: true; user: User }
  | { ok: false; reason: "invalid" | "too_many_attempts" };

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isSixDigitCode(value: string): boolean {
  return /^\d{6}$/.test(value);
}

function otpSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }
  return secret;
}

function hashCode(email: string, code: string): string {
  return createHmac("sha256", otpSecret()).update(`${email}:${code}`).digest("hex");
}

function hashesMatch(expected: string, actual: string): boolean {
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(actual, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function issueLoginCode(
  emailInput: string,
  ip: string | null,
): Promise<IssueCodeResult> {
  const prisma = getPrisma();
  const email = normalizeEmail(emailInput);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [recent, emailCount, ipCount] = await Promise.all([
    prisma.loginOtp.findFirst({
      where: { email, created_at: { gt: new Date(now.getTime() - RESEND_COOLDOWN_MS) } },
      select: { id: true },
    }),
    prisma.loginOtp.count({ where: { email, created_at: { gte: hourAgo } } }),
    ip
      ? prisma.loginOtp.count({ where: { ip, created_at: { gte: hourAgo } } })
      : Promise.resolve(0),
  ]);

  if (recent) return { ok: false, reason: "cooldown" };
  if (emailCount >= MAX_SENDS_PER_HOUR || ipCount >= MAX_SENDS_PER_IP_PER_HOUR) {
    return { ok: false, reason: "rate_limited" };
  }

  await prisma.loginOtp.updateMany({
    where: { email, consumed_at: null },
    data: { consumed_at: now },
  });

  await prisma.loginOtp
    .deleteMany({ where: { expires_at: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
    .catch(() => undefined);

  const code = generateCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MS);
  const otp = await prisma.loginOtp.create({
    data: { email, code_hash: hashCode(email, code), expires_at: expiresAt, ip },
    select: { id: true },
  });

  return { ok: true, id: otp.id, code, expiresAt };
}

export async function cancelLoginCode(id: string): Promise<void> {
  await getPrisma()
    .loginOtp.update({ where: { id }, data: { consumed_at: new Date() } })
    .catch(() => undefined);
}

export async function verifyLoginCode(
  emailInput: string,
  code: string,
): Promise<VerifyCodeResult> {
  const prisma = getPrisma();
  const email = normalizeEmail(emailInput);
  const now = new Date();

  const otp = await prisma.loginOtp.findFirst({
    where: { email, consumed_at: null, expires_at: { gt: now } },
    orderBy: { created_at: "desc" },
  });

  if (!otp) return { ok: false, reason: "invalid" };
  if (otp.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  if (!hashesMatch(otp.code_hash, hashCode(email, code))) {
    await prisma.loginOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "invalid" };
  }

  const user = await prisma.$transaction(async (tx) => {
    const claimed = await tx.loginOtp.updateMany({
      where: { id: otp.id, consumed_at: null, attempts: { lt: MAX_ATTEMPTS } },
      data: { consumed_at: now },
    });
    if (claimed.count !== 1) return null;

    const account = await tx.user.upsert({
      where: { email },
      create: { email, email_verified: now },
      update: { email_verified: now },
    });

    await tx.profile.upsert({
      where: { id: account.id },
      create: { id: account.id, display_name: account.name },
      update: {},
    });

    return account;
  });

  if (!user) return { ok: false, reason: "invalid" };
  return { ok: true, user };
}
