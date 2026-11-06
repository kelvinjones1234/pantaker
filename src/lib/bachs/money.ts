import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export { formatKobo } from "@/lib/bachs/format";

const KOBO_PER_NAIRA = 100;
const MAX_SAFE_KOBO = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/**
 * Parse a NGN decimal string (as returned by Bachs) into integer kobo. Strings
 * are parsed digit-by-digit rather than through floating point, so "19.99"
 * can never become 1998.9999999999998.
 */
export function amountToKobo(value: unknown): number {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return value * KOBO_PER_NAIRA;
  }
  if (typeof value !== "string") {
    throw new MoneyError("Money must be a decimal string.");
  }
  const match = /^(\d+)(?:\.(\d{0,2}))?$/.exec(value.trim());
  if (!match) throw new MoneyError("Money must be a valid NGN amount.");
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const kobo = whole * KOBO_PER_NAIRA + fraction;
  if (!Number.isSafeInteger(kobo) || kobo > MAX_SAFE_KOBO) {
    throw new MoneyError("That amount is too large.");
  }
  return kobo;
}

/** Format integer kobo as the decimal string Bachs expects ("1234.50"). */
export function koboToAmount(kobo: number): string {
  if (!Number.isSafeInteger(kobo) || kobo < 0) {
    throw new MoneyError("Kobo must be a non-negative integer.");
  }
  const whole = Math.floor(kobo / KOBO_PER_NAIRA);
  const fraction = String(kobo % KOBO_PER_NAIRA).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function nairaToKobo(value: number): number {
  return Math.round(value * KOBO_PER_NAIRA);
}

export const SELLER_COMMISSION_RATE = 0.05;

/** Pantaker's 5% seller commission, rounded to the nearest kobo. */
export function commissionFor(itemKobo: number): number {
  if (!Number.isSafeInteger(itemKobo) || itemKobo <= 0) {
    throw new MoneyError("Order amount must be a positive integer.");
  }
  return Math.round(itemKobo * SELLER_COMMISSION_RATE);
}

export function sellerShareFor(itemKobo: number): number {
  return itemKobo - commissionFor(itemKobo);
}

function pickupSecret(): string {
  const secret =
    process.env.PICKUP_CODE_SECRET?.trim() || process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "PICKUP_CODE_SECRET is required for order handover. AUTH_SECRET is only a local fallback.",
    );
  }
  return secret;
}

/**
 * A deterministic six-digit pickup code. The buyer can re-open their order and
 * still see it, while only a hash is stored in the database. Deriving it from
 * the order and buyer ids prevents one order's code from working on another.
 */
export function pickupCodeFor(orderId: string, buyerId: string): string {
  const digest = createHmac("sha256", pickupSecret())
    .update(`pantaker-pickup:${orderId}:${buyerId}`)
    .digest();
  const value = digest.readUInt32BE(0) % 1_000_000;
  return String(value).padStart(6, "0");
}

export function hashPickupCode(code: string): string {
  return createHash("sha256")
    .update(`pantaker-pickup-code:${pickupSecret()}:${code}`)
    .digest("hex");
}

export function verifyPickupCode(
  code: string,
  storedHash: string | null,
): boolean {
  if (!storedHash || !/^\d{6}$/.test(code)) return false;
  const expected = Buffer.from(hashPickupCode(code), "hex");
  const actual = Buffer.from(storedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function releaseDueFrom(date: Date): Date {
  return new Date(date.getTime() + 72 * 60 * 60 * 1000);
}
