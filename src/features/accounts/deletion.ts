import { deleteUnreferencedImages } from "@/lib/image-cleanup";
import { withServiceContext } from "@/lib/db/context";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR =
  "We couldn't delete the account. Please try again or contact support.";

/**
 * Delete an account and its domain data in one Postgres transaction, then remove
 * unreferenced R2 objects. The database function records the audit event
 * and deletes the identity row last.
 */
export async function deleteAccountCompletely(
  userId: string,
  actorId: string = userId,
): Promise<DeleteAccountResult> {
  if (!isPrismaConfigured()) {
    return { ok: false, error: "Deleting an account needs database configuration." };
  }

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { admin_role: true },
    });

    if (target?.admin_role === "super_admin") {
      const otherSuperAdmins = await prisma.user.count({
        where: { admin_role: "super_admin", id: { not: userId } },
      });
      if (otherSuperAdmins === 0) {
        return {
          ok: false,
          error: "Pantaker needs at least one super admin. Promote another account first.",
        };
      }
    }

    const [openOrders, paymentAccount, payoutInFlight] = await Promise.all([
      prisma.order.count({
        where: {
          OR: [{ buyer_id: userId }, { seller_id: userId }],
          status: {
            in: [
              "pending_payment",
              "held",
              "ready_for_handover",
              "handed_over",
              "release_blocked",
              "disputed",
              "refund_pending",
            ],
          },
        },
      }),
      prisma.sellerPaymentAccount.findUnique({
        where: { user_id: userId },
        select: { available_balance_kobo: true, pending_balance_kobo: true },
      }),
      prisma.sellerPayout.count({
        where: {
          seller_id: userId,
          status: { in: ["pending", "processing"] },
        },
      }),
    ]);
    if (openOrders > 0) {
      return {
        ok: false,
        error:
          "This account has an order in progress. Finish or resolve it before deleting the account.",
      };
    }
    if (
      Number(paymentAccount?.available_balance_kobo ?? 0) > 0 ||
      Number(paymentAccount?.pending_balance_kobo ?? 0) > 0
    ) {
      return {
        ok: false,
        error:
          "Withdraw your remaining Bachs balance before deleting the account.",
      };
    }
    if (payoutInFlight > 0) {
      return {
        ok: false,
        error:
          "A withdrawal is still processing. Wait for it to finish before deleting the account.",
      };
    }

    const [listings, profile] = await Promise.all([
      prisma.listing.findMany({
        where: { seller_id: userId },
        select: { images: { select: { storage_path: true } } },
      }),
      prisma.profile.findUnique({
        where: { id: userId },
        select: { avatar_path: true },
      }),
    ]);
    const imagePaths = listings.flatMap((listing) =>
      listing.images.map((image) => image.storage_path).filter(Boolean),
    );
    if (profile?.avatar_path) imagePaths.push(profile.avatar_path);

    await withServiceContext(actorId, (tx) =>
      tx.$executeRaw`select public.admin_delete_account_data(${userId}::uuid)`,
    );

    await deleteUnreferencedImages(imagePaths);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}
