import { deleteUnreferencedImages } from "@/lib/image-cleanup";
import { withServiceContext } from "@/lib/db/context";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

const GENERIC_ERROR =
  "We couldn't delete the account. Please try again or contact support.";

/**
 * Delete an account and its domain data in one Postgres transaction, then remove
 * unreferenced Cloudflare assets. The database function records the audit event
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

    const listings = await prisma.listing.findMany({
      where: { seller_id: userId },
      select: { images: { select: { storage_path: true } } },
    });
    const imagePaths = listings.flatMap((listing) =>
      listing.images.map((image) => image.storage_path).filter(Boolean),
    );

    await withServiceContext(actorId, (tx) =>
      tx.$executeRaw`select public.admin_delete_account_data(${userId}::uuid)`,
    );

    await deleteUnreferencedImages(imagePaths);
    return { ok: true };
  } catch {
    return { ok: false, error: GENERIC_ERROR };
  }
}
