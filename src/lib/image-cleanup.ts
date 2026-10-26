import { deleteStoredImage } from "@/lib/image-storage";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

/**
 * Count every database reference to an object key. A key is only safe to delete
 * when no listing, profile, or category still points at it.
 */
export async function countImageReferences(path: string): Promise<number> {
  if (!isPrismaConfigured() || !path) return 1;

  const prisma = getPrisma();
  const [listingImages, profiles, categories] = await Promise.all([
    prisma.listingImage.count({ where: { storage_path: path } }),
    prisma.profile.count({ where: { avatar_path: path } }),
    prisma.category.count({ where: { icon_key: path } }),
  ]);

  return listingImages + profiles + categories;
}

/**
 * Delete stored image assets only after their rows are gone. Prisma reads the
 * authoritative rows directly, so a private/unpublished listing cannot hide a
 * remaining reference.
 */
export async function deleteUnreferencedImages(paths: string[]): Promise<void> {
  if (!isPrismaConfigured()) return;

  const uniquePaths = [
    ...new Set(paths.filter((path) => typeof path === "string" && path)),
  ];
  if (uniquePaths.length === 0) return;

  try {
    for (const path of uniquePaths) {
      const references = await countImageReferences(path);
      if (references > 0) continue;
      await deleteStoredImage(path);
    }
  } catch {
    // Best effort: an orphaned image is preferable to blocking account/listing deletion.
  }
}
