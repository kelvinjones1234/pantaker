import Link from "next/link";
import {
  HomeIcon,
  InfoIcon,
  MarketplaceIcon,
  TagIcon,
} from "@/components/brand/icons";
import {
  MobileProfileLink,
  MobileQuickNav,
  mobileNavItemClass,
  QuickNavRail,
  railItemClass,
} from "@/components/marketplace/QuickNavRail";

export function ListingQuickNav({
  user = null,
  category,
}: {
  user?: { email?: string | null } | null;
  category: { name: string; slug: string } | null;
}) {
  return (
    <>
      <QuickNavRail user={user}>
        <Link href="/" aria-label="Pantaker home" className={railItemClass}>
          <HomeIcon className="h-[21px] w-[21px]" />
        </Link>
        <Link
          href="/marketplace"
          aria-label="Browse marketplace"
          className={railItemClass}
        >
          <MarketplaceIcon className="h-[21px] w-[21px]" />
        </Link>
        {category && (
          <Link
            href={`/marketplace/${category.slug}`}
            aria-label={`Browse ${category.name}`}
            className={railItemClass}
          >
            <TagIcon className="h-[21px] w-[21px]" />
          </Link>
        )}
        <Link href="/#how" aria-label="How it works" className={railItemClass}>
          <InfoIcon className="h-[21px] w-[21px]" />
        </Link>
      </QuickNavRail>

      <MobileQuickNav>
        <Link href="/" aria-label="Pantaker home" className={mobileNavItemClass}>
          <HomeIcon className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link
          href="/marketplace"
          aria-label="Browse marketplace"
          className={mobileNavItemClass}
        >
          <MarketplaceIcon className="h-5 w-5" />
          <span>Pantaker</span>
        </Link>
        {category && (
          <Link
            href={`/marketplace/${category.slug}`}
            aria-label={`Browse ${category.name}`}
            className={mobileNavItemClass}
          >
            <TagIcon className="h-5 w-5" />
            <span>Category</span>
          </Link>
        )}
        <Link
          href="/#how"
          aria-label="How it works"
          className={mobileNavItemClass}
        >
          <InfoIcon className="h-5 w-5" />
          <span>How</span>
        </Link>
        <MobileProfileLink user={user} />
      </MobileQuickNav>
    </>
  );
}
