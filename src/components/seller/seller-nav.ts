import {
  BellIcon,
  ChatIcon,
  GearIcon,
  HomeIcon,
  ReceiptIcon,
  TagIcon,
  UserIcon,
  type BrandIconComponent,
} from "@/components/brand/icons";

export interface SellerNavItem {
  href: string;
  label: string;
  /** Shorter label for the mobile dock. */
  shortLabel?: string;
  icon: BrandIconComponent;
  /** Match only the exact path (used for the index route). */
  exact?: boolean;
  /** Reachable elsewhere on small screens, so the mobile dock omits it. */
  hideOnMobile?: boolean;
  /** Nav item that carries an unread badge. */
  badgeKey?: "messages" | "notifications";
}

/** Navigation for the Seller Centre. Only routes that exist are listed. */
export const SELLER_NAV: SellerNavItem[] = [
  { href: "/seller", label: "Overview", icon: HomeIcon, exact: true },
  { href: "/seller/listings", label: "My Listings", shortLabel: "Listings", icon: TagIcon },
  { href: "/seller/sales", label: "Sales", icon: ReceiptIcon },
  { href: "/seller/messages", label: "Messages", icon: ChatIcon, badgeKey: "messages" },
  // Notifications also reach the seller through the mobile header bell, so the
  // crowded dock omits it; it stays in the desktop rail.
  { href: "/notifications", label: "Notifications", icon: BellIcon, badgeKey: "notifications", hideOnMobile: true },
  // Profile is reachable from Settings → Account on mobile, so it stays out of
  // the crowded dock; it remains in the desktop rail.
  { href: "/seller/profile", label: "Profile", shortLabel: "Profile", icon: UserIcon, hideOnMobile: true },
  { href: "/seller/settings", label: "Settings", icon: GearIcon },
];

export function sellerNavForMobile(): SellerNavItem[] {
  return SELLER_NAV.filter((item) => !item.hideOnMobile);
}

export function isSellerNavActive(
  pathname: string,
  item: Pick<SellerNavItem, "href" | "exact">,
): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
