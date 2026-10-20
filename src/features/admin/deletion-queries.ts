import { readAccountDirectory } from "@/features/admin/account-queries";
import { getPrisma, isPrismaConfigured } from "@/lib/prisma";

export interface AdminDeletionRequestRow {
  id: string;
  email: string | null;
  displayName: string | null;
  username: string | null;
  requestedAt: string;
}

export type AdminDeletionRequestResult =
  { ok: true; rows: AdminDeletionRequestRow[] } | { ok: false; error: string };

export async function loadDeletionRequests(): Promise<AdminDeletionRequestResult> {
  if (!isPrismaConfigured()) {
    return {
      ok: false,
      error: "Deletion requests need database configuration.",
    };
  }

  try {
    const profiles = await getPrisma().profile.findMany({
      where: { deletion_requested_at: { not: null } },
      orderBy: { deletion_requested_at: "asc" },
      select: {
        id: true,
        display_name: true,
        username: true,
        deletion_requested_at: true,
      },
    });

    const directory = await readAccountDirectory();

    return {
      ok: true,
      rows: profiles.map((profile) => ({
        id: profile.id,
        email: directory.get(profile.id)?.email ?? null,
        displayName: profile.display_name,
        username: profile.username,
        requestedAt: (
          profile.deletion_requested_at ?? new Date()
        ).toISOString(),
      })),
    };
  } catch {
    return {
      ok: false,
      error: "Could not load deletion requests. Please try again.",
    };
  }
}
