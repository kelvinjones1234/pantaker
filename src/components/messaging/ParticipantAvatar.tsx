import { deliveryUrl, isImageStorageConfigured } from "@/lib/image-storage";
import { cn } from "@/lib/utils";
import { StorageImage } from "@/components/ui/storage-image";

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function avatarUrl(path: string | null | undefined): string | undefined {
  if (!path || !isImageStorageConfigured()) return undefined;
  try {
    return deliveryUrl(path);
  } catch {
    return undefined;
  }
}

/**
 * Neutral participant avatar. Uses the R2 image when available, and
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
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-canvas-mist)] text-[12px] font-semibold text-[var(--color-ash-veil)]",
        className,
      )}
      aria-hidden="true"
    >
      <StorageImage
        src={src}
        alt=""
        fill
        sizes="40px"
        className="object-cover"
        fallback={initials(label)}
      />
    </span>
  );
}
