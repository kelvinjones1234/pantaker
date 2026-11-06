export type SocialPlatformKey = "instagram" | "x" | "facebook" | "tiktok";

export type SocialHandleField =
  | "instagram_handle"
  | "x_handle"
  | "facebook_handle"
  | "tiktok_handle";

export interface SocialPlatform {
  key: SocialPlatformKey;
  label: string;
  field: SocialHandleField;
  maxLength: number;
  /** Handle characters, without the leading @. */
  pattern: RegExp;
  url: (handle: string) => string;
}

export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  {
    key: "instagram",
    label: "Instagram",
    field: "instagram_handle",
    maxLength: 30,
    pattern: /^[A-Za-z0-9._]{1,30}$/,
    url: (handle) => `https://instagram.com/${encodeURIComponent(handle)}`,
  },
  {
    key: "x",
    label: "X",
    field: "x_handle",
    maxLength: 15,
    pattern: /^[A-Za-z0-9_]{1,15}$/,
    url: (handle) => `https://x.com/${encodeURIComponent(handle)}`,
  },
  {
    key: "facebook",
    label: "Facebook",
    field: "facebook_handle",
    maxLength: 50,
    pattern: /^[A-Za-z0-9.]{1,50}$/,
    url: (handle) => `https://facebook.com/${encodeURIComponent(handle)}`,
  },
  {
    key: "tiktok",
    label: "TikTok",
    field: "tiktok_handle",
    maxLength: 24,
    pattern: /^[A-Za-z0-9._]{1,24}$/,
    url: (handle) => `https://tiktok.com/@${encodeURIComponent(handle)}`,
  },
] as const;

export interface ContactFields {
  phone: string | null;
  phone_is_whatsapp: boolean;
  instagram_handle: string | null;
  x_handle: string | null;
  facebook_handle: string | null;
  tiktok_handle: string | null;
}

/** Strip a leading @ and surrounding whitespace. Empty input becomes null. */
export function normalizeHandle(
  raw: string | null | undefined,
): string | null {
  const trimmed = (raw ?? "").trim().replace(/^@+/, "").trim();
  return trimmed ? trimmed : null;
}

export function phoneDigits(phone: string | null | undefined): string {
  return (phone ?? "").replace(/\D/g, "");
}

/** A tel: link that keeps only digits and a leading +. */
export function phoneHref(phone: string | null | undefined): string | null {
  const normalized = (phone ?? "")
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");
  return normalized ? `tel:${normalized}` : null;
}

/** wa.me only accepts digits, so the number must include its country code. */
export function whatsappHref(phone: string | null | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits ? `https://wa.me/${digits}` : null;
}

export interface SocialLink {
  key: SocialPlatformKey;
  label: string;
  handle: string;
  href: string;
}

export function socialLinks(
  contact: Pick<ContactFields, SocialHandleField>,
): SocialLink[] {
  return SOCIAL_PLATFORMS.flatMap((platform) => {
    const handle = contact[platform.field];
    if (!handle) return [];
    return [
      {
        key: platform.key,
        label: platform.label,
        handle,
        href: platform.url(handle),
      },
    ];
  });
}

export function hasContactDetails(contact: ContactFields): boolean {
  return Boolean(
    contact.phone ||
      contact.instagram_handle ||
      contact.x_handle ||
      contact.facebook_handle ||
      contact.tiktok_handle,
  );
}

export interface AvailableContactChannels {
  has_phone: boolean;
  has_whatsapp: boolean;
  socials: SocialPlatformKey[];
}

export function availableContactChannels(
  contact: ContactFields | null | undefined,
): AvailableContactChannels {
  if (!contact) {
    return { has_phone: false, has_whatsapp: false, socials: [] };
  }
  return {
    has_phone: Boolean(contact.phone),
    has_whatsapp: Boolean(contact.phone && contact.phone_is_whatsapp),
    socials: socialLinks(contact).map((s) => s.key),
  };
}

export function hasAnyContactChannel(
  channels: AvailableContactChannels | null | undefined,
): boolean {
  if (!channels) return false;
  return channels.has_phone || channels.socials.length > 0;
}
