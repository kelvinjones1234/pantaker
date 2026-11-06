import { cn } from "@/lib/utils";
import { orderStatusMeta } from "@/features/orders/lifecycle";

export function OrderStatusPill({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = orderStatusMeta(status);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        meta.tone === "success" &&
          "bg-[var(--color-success-bg)] text-[var(--color-success)]",
        meta.tone === "warning" &&
          "bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
        meta.tone === "danger" &&
          "bg-[var(--color-error-bg)] text-[var(--color-error)]",
        meta.tone === "neutral" &&
          "bg-[var(--color-canvas-mist)] text-[var(--color-ash-veil)]",
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
