import type { Profile, User } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

/** Pull a human name from the identity row when available. */
export function profileNameFromUser(user: Pick<User, "name">): string | null {
  const name = user.name?.trim();
  return name ? name.slice(0, 80) : null;
}

/**
 * Idempotently mirror the identity row into the Prisma `profiles` table.
 * Sign-in already creates this row, so this is safe to call after any auth
 * transition where a profile may have been missing.
 */
export async function ensureProfile(user: User): Promise<Profile> {
  const prisma = getPrisma();
  return prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      display_name: profileNameFromUser(user),
      account_type: "individual",
    },
    update: {},
  });
}
