import Link from "next/link";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";
import { getAuthUser } from "@/features/auth/queries";
import { isAdminUser } from "@/features/admin/roles";

export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthUser().catch(() => null);

  return (
    <div className="min-h-screen bg-[var(--shop-canvas)] text-[var(--color-ink-black)]">
      <MarketplaceHeader
        user={user ? { email: user.email, isAdmin: isAdminUser(user) } : null}
      />
      {children}
      <footer className="mt-12 border-t border-[var(--color-faint-border)]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-8 text-[12px] text-[var(--color-ash-veil)] sm:px-6">
          <span>Pantaker buyer protection</span>
          <Link
            href="/help"
            className="font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
          >
            Help and safety
          </Link>
        </div>
      </footer>
    </div>
  );
}
