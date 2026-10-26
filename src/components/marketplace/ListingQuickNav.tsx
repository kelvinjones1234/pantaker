import Link from "next/link";
import {
  GridIcon,
  HomeIcon,
  TagIcon,
  WrenchIcon,
} from "@/components/brand/icons";
import {
  MobileProfileLink,
  MobileQuickNav,
  mobileNavItemClass,
  QuickNavRail,
} from "@/components/marketplace/QuickNavRail";

const actionClass =
  "flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--color-muted-gray)] transition-colors duration-200 hover:bg-[var(--color-canvas-mist)] hover:text-[var(--color-ink-black)]";

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
        <Link href="/" aria-label="Pantaker home" className={actionClass}>
          <HomeIcon className="h-[22px] w-[22px]" />
        </Link>
        <Link
          href="/marketplace"
          aria-label="Browse marketplace"
          className={actionClass}
        >
          <GridIcon className="h-[21px] w-[21px]" />
        </Link>
        {category && (
          <Link
            href={`/marketplace/${category.slug}`}
            aria-label={`Browse ${category.name}`}
            className={actionClass}
          >
            <TagIcon className="h-[21px] w-[21px]" />
          </Link>
        )}
        <Link href="/#how" aria-label="How it works" className={actionClass}>
          <WrenchIcon className="h-[21px] w-[21px]" />
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
          <GridIcon className="h-5 w-5" />
          <span>Browse</span>
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
          <WrenchIcon className="h-5 w-5" />
          <span>How</span>
        </Link>
        <MobileProfileLink user={user} />
      </MobileQuickNav>
    </>
  );
}
