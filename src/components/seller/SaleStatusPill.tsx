import { cn } from "@/lib/utils";
import { saleStatusMeta } from "@/lib/sale-status";

/**
 * Neutral status pill for a sale. Only a cancelled sale uses the system error
 * colour; completed and in-progress sales stay white-on-hairline so the single
 * violet accent is never spent on status.
 */
export function SaleStatusPill({ status, className }: { status: string; className?: string }) {
  const meta = saleStatusMeta(status);
  const label = meta?.label ?? status.replace(/_/g, " ");
  const danger = meta?.tone === "danger";

  return (
    <span
      className={cn(
        "badge-condition",
        danger
          ? "border-transparent bg-[var(--color-error-bg)] text-[var(--color-error)]"
          : "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)]",
        className,
      )}
    >
      {label}
    </span>
  );
}
