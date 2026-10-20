import {
  BellIcon,
  GearIcon,
  HelpIcon,
  KeyIcon,
  ShieldIcon,
  SlidersIcon,
  type BrandIconComponent,
} from "@/components/brand/icons";

export interface SettingsGroup {
  href: string;
  label: string;
  icon: BrandIconComponent;
  blurb: string;
}

/** The six settings groups. Order mirrors the task outline. */
export const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    href: "/seller/settings/account",
    label: "Account",
    icon: GearIcon,
    blurb: "Your email address and how you sign in.",
  },
  {
    href: "/seller/settings/notifications",
    label: "Notifications",
    icon: BellIcon,
    blurb: "What Pantaker tells you about, and where.",
  },
  {
    href: "/seller/settings/privacy",
    label: "Privacy and safety",
    icon: ShieldIcon,
    blurb: "Reporting, blocking, and what stays private.",
  },
  {
    href: "/seller/settings/listing-preferences",
    label: "Listing preferences",
    icon: SlidersIcon,
    blurb: "Defaults applied to every new listing.",
  },
  {
    href: "/seller/settings/help",
    label: "Help and support",
    icon: HelpIcon,
    blurb: "Straight answers about how selling works.",
  },
  {
    href: "/seller/settings/account-management",
    label: "Account management",
    icon: KeyIcon,
    blurb: "Sign out, recover access, or close your account.",
  },
];

export function isSettingsGroupActive(pathname: string, href: string): boolean {
  return pathname === href;
}
