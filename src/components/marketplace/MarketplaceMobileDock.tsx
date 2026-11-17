"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, InfoIcon, MarketplaceIcon, TagIcon } from "@/components/brand/icons";
import {
  MobileProfileLink,
  MobileQuickNav,
  mobileNavItemClass,
} from "@/components/marketplace/QuickNavRail";

/** Public marketplace dock for browse and category pages. */
export function MarketplaceMobileDock({
  user = null,
}: {
  user?: { email?: string | null } | null;
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/marketplace/listing/")) return null;

  const isMarketActive =
    pathname === "/marketplace" || pathname.startsWith("/marketplace/");

  return (
    <MobileQuickNav>
      <Link
        href="/"
        aria-label="Pantaker home"
        data-active={pathname === "/"}
        className={mobileNavItemClass}
      >
        <HomeIcon className="h-5 w-5" />
        <span>Home</span>
      </Link>
      <Link
        href="/marketplace"
        aria-label="Browse marketplace"
        aria-current={isMarketActive ? "page" : undefined}
        data-active={isMarketActive}
        className={mobileNavItemClass}
      >
        <MarketplaceIcon className="h-5 w-5" />
        <span>Market</span>
      </Link>
      <Link href="/#feed" aria-label="Marketplace feed" className={mobileNavItemClass}>
        <TagIcon className="h-5 w-5" />
        <span>Feed</span>
      </Link>
      <Link href="/#how" aria-label="How it works" className={mobileNavItemClass}>
        <InfoIcon className="h-5 w-5" />
        <span>How</span>
      </Link>
      <MobileProfileLink user={user} />
    </MobileQuickNav>
  );
}
