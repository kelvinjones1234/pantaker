import Link from "next/link";
import {
  FacebookIcon,
  InstagramIcon,
  PhoneIcon,
  ShieldIcon,
  TikTokIcon,
  WhatsAppIcon,
  XLogoIcon,
  type BrandIconComponent,
} from "@/components/brand/icons";
import {
  hasAnyContactChannel,
  hasContactDetails,
  phoneHref,
  socialLinks,
  whatsappHref,
  type AvailableContactChannels,
  type ContactFields,
  type SocialPlatformKey,
} from "@/lib/contact";

const SOCIAL_ICONS: Record<SocialPlatformKey, BrandIconComponent> = {
  instagram: InstagramIcon,
  x: XLogoIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
};

const SOCIAL_LABELS: Record<SocialPlatformKey, string> = {
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  tiktok: "TikTok",
};

export interface SellerContactLinksProps {
  contact: ContactFields;
  availableChannels?: AvailableContactChannels | null;
  isAuthenticated?: boolean;
  isOwner?: boolean;
  listingId?: string;
}

export function SellerContactLinks({
  contact,
  availableChannels,
  isAuthenticated = false,
  isOwner = false,
  listingId,
}: SellerContactLinksProps) {
  const isUnlocked = isAuthenticated || isOwner;
  const channels = availableChannels ?? {
    has_phone: Boolean(contact.phone),
    has_whatsapp: Boolean(contact.phone && contact.phone_is_whatsapp),
    socials: socialLinks(contact).map((s) => s.key),
  };

  const hasAnyChannel =
    hasAnyContactChannel(channels) || hasContactDetails(contact);
  if (!hasAnyChannel) return null;

  // 1. LOCKED TEASER FOR UNAUTHENTICATED VISITORS
  if (!isUnlocked) {
    const signInHref = listingId
      ? `/login?next=${encodeURIComponent(`/marketplace/listing/${listingId}`)}`
      : "/login";

    return (
      <section
        aria-label="Direct seller contact"
        className="mt-6 rounded-[24px] bg-[var(--color-canvas-mist)] p-5"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-pure-white)] text-[var(--color-shop-violet)] shadow-sm">
            <ShieldIcon className="h-4 w-4" />
          </span>
          <h3 className="text-[13px] font-semibold tracking-tight text-[var(--color-ink-black)]">
            Direct seller contact
          </h3>
        </div>

        <p className="mt-2 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
          Sign in to view this seller&apos;s direct phone number, WhatsApp, and social accounts.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {channels.has_phone && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pure-white)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-ink-black)] shadow-sm">
              <PhoneIcon className="h-3.5 w-3.5 text-[var(--color-shop-violet)]" />
              Phone call
            </span>
          )}
          {channels.has_whatsapp && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pure-white)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-ink-black)] shadow-sm">
              <WhatsAppIcon className="h-3.5 w-3.5 text-[var(--color-shop-violet)]" />
              WhatsApp
            </span>
          )}
          {channels.socials.map((platform) => {
            const Icon = SOCIAL_ICONS[platform];
            return (
              <span
                key={platform}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-pure-white)] px-3 py-1.5 text-[11px] font-semibold text-[var(--color-ink-black)] shadow-sm"
              >
                <Icon className="h-3.5 w-3.5 text-[var(--color-shop-violet)]" />
                {SOCIAL_LABELS[platform]}
              </span>
            );
          })}
        </div>

        <Link
          href={signInHref}
          className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-[13px] font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-shop-violet)] focus-visible:ring-offset-2"
        >
          Contact seller
        </Link>
      </section>
    );
  }

  // 2. UNLOCKED DIRECT CONTACT FOR AUTHENTICATED BUYERS & OWNER
  const tel = phoneHref(contact.phone);
  const whatsapp = contact.phone_is_whatsapp
    ? whatsappHref(contact.phone)
    : null;
  const links = socialLinks(contact);

  return (
    <section
      aria-label="Seller contact options"
      className="mt-6 rounded-[24px] bg-[var(--color-canvas-mist)] p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ash-veil)]">
          Direct contact
        </p>
        {isOwner && (
          <span className="text-[12px] text-[var(--color-muted-gray)]">
            Visible to signed-in buyers
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {contact.phone &&
          (tel ? (
            <a
              href={tel}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-pure-white)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-black)] shadow-sm transition-all duration-150 hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-shop-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-shop-violet)]"
            >
              <PhoneIcon className="h-4 w-4 shrink-0 text-[var(--color-shop-violet)]" />
              <span>{contact.phone}</span>
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-pure-white)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink-black)] shadow-sm">
              <PhoneIcon className="h-4 w-4 shrink-0 text-[var(--color-shop-violet)]" />
              <span>{contact.phone}</span>
            </span>
          ))}

        {whatsapp && (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-4 py-2 text-[13px] font-semibold text-[var(--color-pure-white)] transition-all duration-150 hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-shop-violet)]"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            <span>Chat on WhatsApp</span>
          </a>
        )}
      </div>

      {links.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {links.map((link) => {
            const Icon = SOCIAL_ICONS[link.key];
            return (
              <a
                key={link.key}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${link.label}: @${link.handle}`}
                title={`${link.label}: @${link.handle}`}
                className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--color-pure-white)] px-3.5 py-1.5 text-[12px] font-medium text-[var(--color-ink-black)] shadow-sm transition-colors duration-150 hover:bg-[var(--color-primary-tint)] hover:text-[var(--color-shop-violet)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-shop-violet)]"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>@{link.handle}</span>
              </a>
            );
          })}
        </div>
      )}

      <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
        Always meet in a public place in Abuja. For guaranteed collection, use Pantaker online checkout.
      </p>
    </section>
  );
}
