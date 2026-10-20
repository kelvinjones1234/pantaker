import { StatusPill } from "@/components/ui/status-pill";
import { listingStatusMeta } from "@/lib/listing-status";

/**
 * Neutral status pill. Only a genuine problem ("Needs changes") uses the system
 * error colour; every other status stays white-on-hairline so the single violet
 * accent is never spent on status.
 */
export function SellerStatusPill({ status, className }: { status: string; className?: string }) {
  const meta = listingStatusMeta(status);
  const label = meta?.label ?? status.replace(/_/g, " ");
  return (
    <StatusPill tone={meta?.tone === "danger" ? "danger" : "neutral"} className={className}>
      {label}
    </StatusPill>
  );
}
