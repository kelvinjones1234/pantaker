import type { User } from "@supabase/supabase-js";
import { getPrisma } from "@/lib/prisma";
import type { Profile } from "@/generated/prisma/client";

/** Pull a human name from Supabase user metadata when available. */
export function profileNameFromUser(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const candidates = [meta.display_name, meta.full_name, meta.name];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim().slice(0, 80);
    }
  }
  return null;
}

/**
 * Idempotently mirror the Supabase Auth user into the Prisma `profiles` table.
 * Called after sign-up confirmation and after sign-in; safe to call repeatedly.
 */
export async function ensureProfile(user: User): Promise<Profile> {
  const prisma = getPrisma();
  const displayName = profileNameFromUser(user);
  return prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      display_name: displayName,
      account_type: "individual",
    },
    // Never clobber details the user has since edited on their profile.
    update: {},
  });
}
