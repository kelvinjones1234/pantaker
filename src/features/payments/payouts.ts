import type { BachsPayoutDestination } from "@/lib/bachs/client";
import { listPayoutDestinations } from "@/lib/bachs/client";
import { getPrisma } from "@/lib/prisma";

export type SellerDestinationsResult =
  | { ok: true; destinations: BachsPayoutDestination[] }
  | { ok: false; destinations: []; error: string };

export async function loadSellerDestinations(
  accountId: string,
): Promise<SellerDestinationsResult> {
  try {
    return { ok: true, destinations: await listPayoutDestinations(accountId) };
  } catch (error) {
    console.error("Could not load Bachs payout destinations.", error);
    return {
      ok: false,
      destinations: [],
      error: "We could not reach Bachs to load your bank account. Refresh the page to try again.",
    };
  }
}

export async function getSellerPayouts(userId: string) {
  const rows = await getPrisma().sellerPayout.findMany({
    where: { seller_id: userId },
    orderBy: { created_at: "desc" },
    take: 20,
  });
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    amount_kobo: Number(row.amount_kobo),
    fee_kobo: row.fee_kobo == null ? null : Number(row.fee_kobo),
    status: row.status,
    failure_reason: row.failure_reason,
    created_at: row.created_at.toISOString(),
  }));
}
