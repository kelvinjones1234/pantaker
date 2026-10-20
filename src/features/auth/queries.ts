import { cache } from "react";
import { auth } from "@/auth";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import type { Profile, User } from "@/generated/prisma/client";

/**
 * Current authenticated user, or null. The JWT only carries the user id and
 * session version; the role and account status are read from Postgres so admin
 * changes and global sign-outs take effect immediately.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  if (!isPrismaConfigured()) return null;

  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const user = await getPrisma().user.findUnique({ where: { id: session.user.id } });
    if (!user) return null;

    const version = session.user.session_version;
    if (typeof version === "number" && version !== user.session_version) return null;

    return user;
  } catch {
    return null;
  }
});

/** Prisma profile for the signed-in user, or null. */
export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return getPrisma().profile.findUnique({ where: { id: user.id } });
}

