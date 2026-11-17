import type { BachsPayoutDestination } from "@/lib/bachs/client";

/** NGN destinations Bachs will pay out to right now. */
export function usableNgnDestinations(
  destinations: BachsPayoutDestination[],
): BachsPayoutDestination[] {
  return destinations.filter(
    (item) => item.is_usable === true && (item.currency ?? "NGN") === "NGN",
  );
}

/**
 * The account the payout page shows: the usable default, else the first usable one,
 * else the saved NGN account (for example one still under review or rejected).
 */
export function primaryDestination(
  destinations: BachsPayoutDestination[],
): BachsPayoutDestination | null {
  const usable = usableNgnDestinations(destinations);
  const ngn = destinations.filter((item) => (item.currency ?? "NGN") === "NGN");
  return (
    usable.find((item) => item.is_default) ??
    usable[0] ??
    ngn.find((item) => item.is_default) ??
    ngn[0] ??
    null
  );
}

/** Shows only the last four digits of an account number. */
export function maskedAccountNumber(destination: BachsPayoutDestination): string | null {
  const digits = destination.account_number ?? destination.account_number_last4 ?? null;
  if (!digits) return null;
  return `••••${digits.slice(-4)}`;
}

/** True when a saved destination already points at this bank account. */
export function isSameBankAccount(
  destination: BachsPayoutDestination,
  accountNumber: string,
  bankCode: string,
): boolean {
  if (destination.bank_code && destination.bank_code !== bankCode) return false;
  if (destination.account_number) return destination.account_number === accountNumber;
  if (destination.account_number_last4) {
    return destination.account_number_last4 === accountNumber.slice(-4);
  }
  return false;
}
