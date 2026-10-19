import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";
import type { Profile } from "@/generated/prisma/client";

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** Current Supabase auth user, or null. Returns null in local preview. */
export async function getAuthUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Prisma profile for the signed-in user, or null. */
export async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user || !isPrismaConfigured()) return null;
  const prisma = getPrisma();
  return prisma.profile.findUnique({ where: { id: user.id } });
}
