import {
  AlertIcon,
  GridIcon,
  HomeIcon,
  ShieldIcon,
  TagIcon,
  TrashIcon,
  UserIcon,
  type BrandIconComponent,
} from "@/components/brand/icons";
import type { AdminPermission } from "@/features/admin/roles";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: BrandIconComponent;
  permission?: AdminPermission;
  exact?: boolean;
}

/** Shared admin navigation. Permission-gated items only render for roles that hold them. */
export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: HomeIcon, exact: true },
  {
    href: "/admin/listings",
    label: "Listings",
    icon: TagIcon,
    permission: "listings.review",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: AlertIcon,
    permission: "reports.manage",
  },
  {
    href: "/admin/accounts",
    label: "Accounts",
    icon: UserIcon,
    permission: "users.view",
  },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: GridIcon,
    permission: "listings.review",
  },
  {
    href: "/admin/deletion-requests",
    label: "Deletion requests",
    icon: TrashIcon,
    permission: "users.manage",
  },
  {
    href: "/admin/admins",
    label: "Admins",
    icon: ShieldIcon,
    permission: "admins.manage",
  },
];

export function adminNavFor(
  permissions: readonly AdminPermission[],
): AdminNavItem[] {
  return ADMIN_NAV.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );
}

export function isAdminNavActive(
  pathname: string,
  item: Pick<AdminNavItem, "href" | "exact">,
): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
