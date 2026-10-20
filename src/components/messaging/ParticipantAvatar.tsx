import { deliveryUrl, isCloudflareImagesConfigured } from "@/lib/cloudflare-images";
import { cn } from "@/lib/utils";

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path || !isCloudflareImagesConfigured()) return undefined;
  try {
    return deliveryUrl(path);
  } catch {
    return undefined;
  }
}

/**
 * Neutral participant avatar. Uses the Cloudflare image when available, and
 * otherwise falls back to initials on the mist canvas — never a stock photo.
 */
export function ParticipantAvatar({
  name,
  avatarPath,
  className,
}: {
  name: string | null | undefined;
  avatarPath?: string | null;
  className?: string;
}) {
  const src = avatarUrl(avatarPath);
  const label = name ?? "Pantaker user";

  return (
    <span
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-canvas-mist)] text-[12px] font-semibold text-[var(--color-ash-veil)]",
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(label)
      )}
    </span>
  );
}
