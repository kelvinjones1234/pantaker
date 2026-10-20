import type { Metadata } from "next";
import Link from "next/link";
import { requireSeller } from "@/features/auth/authorization";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { ChevronRightIcon } from "@/components/brand/icons";
import { SETTINGS_GROUPS } from "@/components/seller/settings-nav";

export const metadata: Metadata = {
  title: "Settings — Pantaker",
  description: "Manage your Pantaker seller account, notifications, privacy, and listings.",
};

export default async function SettingsIndexPage() {
  await requireSeller("/seller/settings");

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Settings"
        description="Manage your account, what you're told about, your privacy, and how new listings start."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Link
              key={group.href}
              href={group.href}
              className="shop-card group flex items-start gap-4 p-5 transition-colors duration-150 hover:bg-[var(--color-canvas-mist)]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-brand-serif text-[15px] font-bold tracking-tight text-[var(--color-ink-black)]">
                    {group.label}
                  </span>
                  <ChevronRightIcon className="h-4 w-4 shrink-0 text-[var(--color-muted-gray)]" />
                </span>
                <span className="mt-1 block text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                  {group.blurb}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
