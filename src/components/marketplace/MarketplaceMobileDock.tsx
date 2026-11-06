"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GridIcon, HomeIcon, TagIcon, WrenchIcon } from "@/components/brand/icons";
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

  return (
    <MobileQuickNav>
      <Link href="/" aria-label="Pantaker home" className={mobileNavItemClass}>
        <HomeIcon className="h-5 w-5" />
        <span>Home</span>
      </Link>
      <Link
        href="/marketplace"
        aria-label="Browse marketplace"
        aria-current="page"
        data-active="true"
        className={mobileNavItemClass}
      >
        <GridIcon className="h-5 w-5" />
        <span>Shop</span>
      </Link>
      <Link href="/#feed" aria-label="Marketplace feed" className={mobileNavItemClass}>
        <TagIcon className="h-5 w-5" />
        <span>Feed</span>
      </Link>
      <Link href="/#how" aria-label="How it works" className={mobileNavItemClass}>
        <WrenchIcon className="h-5 w-5" />
        <span>How</span>
      </Link>
      <MobileProfileLink user={user} />
    </MobileQuickNav>
  );
}
