import { deleteCloudflareImage } from "@/lib/cloudflare-images";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

/**
 * Delete stored image assets only after their listing image rows are gone.
 * Prisma reads the authoritative rows directly, so a private/unpublished
 * listing cannot hide a remaining reference.
 */
export async function deleteUnreferencedImages(paths: string[]): Promise<void> {
  if (!isPrismaConfigured()) return;

  const uniquePaths = [...new Set(paths.filter((path) => typeof path === "string" && path))];
  if (uniquePaths.length === 0) return;

  try {
    const prisma = getPrisma();
    for (const path of uniquePaths) {
      const count = await prisma.listingImage.count({ where: { storage_path: path } });
      if (count > 0) continue;
      await deleteCloudflareImage(path);
    }
  } catch {
    // Best effort: an orphaned image is preferable to blocking account/listing deletion.
  }
}
