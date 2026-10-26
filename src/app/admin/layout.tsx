import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/features/admin/authorization";
import { Logo } from "@/components/brand/Logo";
import { LogoutIcon, ShieldIcon } from "@/components/brand/icons";
import { AdminNav } from "@/components/admin/AdminNav";
import { getAdminRole, permissionsForRole } from "@/features/admin/roles";

/**
 * Server-side gate for the whole admin area: authentication and the admin role
 * are enforced before any child renders. The gate never previews, so there is no
 * unauthenticated admin in development either. Every admin page also calls
 * `requireAdmin` itself as defence in depth.
 */
export const metadata: Metadata = {
  title: "Admin — Pantaker",
  description: "Pantaker platform administration.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin("/admin");
  const permissions = permissionsForRole(getAdminRole(admin));

  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <header className="sticky top-0 z-30 bg-[var(--color-pure-white)]">
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="flex items-center gap-2.5"
            aria-label="Pantaker admin home"
          >
            <Logo compact />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-canvas-mist)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-ash-veil)]">
              <ShieldIcon className="h-3.5 w-3.5" />
              Admin
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/seller"
              className="hidden rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-muted-gray)] transition-colors duration-150 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)] sm:inline-flex"
            >
              Seller Centre
            </Link>
            {admin.email && (
              <span
                className="hidden max-w-[240px] truncate text-[12px] text-[var(--color-ash-veil)] sm:block"
                title={admin.email}
              >
                {admin.email}
              </span>
            )}
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-canvas-mist)] px-4 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-primary-tint)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <AdminNav permissions={permissions} />

      <main className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
