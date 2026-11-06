import { CheckIcon } from "@/components/brand/icons";
import { orderStatusMeta } from "@/features/orders/lifecycle";
import { cn } from "@/lib/utils";

const STAGES = [
  { key: "paid", label: "Payment" },
  { key: "ready", label: "Ready for handover" },
  { key: "collected", label: "Collected" },
  { key: "paid_out", label: "Seller paid" },
] as const;

const STAGE_INDEX: Record<string, number> = {
  pending_payment: 0,
  held: 1,
  ready_for_handover: 2,
  handed_over: 3,
  released: 4,
};

const EXCEPTION_STATUSES = new Set([
  "refund_pending",
  "refunded",
  "disputed",
  "release_blocked",
  "expired",
  "payment_failed",
  "cancelled",
]);

export function OrderProgress({ status }: { status: string }) {
  if (EXCEPTION_STATUSES.has(status)) {
    const meta = orderStatusMeta(status);
    return (
      <div className="rounded-[16px] bg-[var(--color-canvas-mist)] p-4">
        <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
          {meta.label}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
          {meta.description}
        </p>
      </div>
    );
  }

  const completed = STAGE_INDEX[status] ?? 0;

  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-4" aria-label="Order progress">
      {STAGES.map((stage, index) => {
        const isDone = index < completed;
        const isCurrent = index === completed;
        return (
          <li
            key={stage.key}
            aria-current={isCurrent ? "step" : undefined}
            className="flex items-center gap-2.5 sm:flex-col sm:items-start"
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                isDone &&
                  "bg-[var(--color-shop-violet)] text-[var(--color-pure-white)]",
                isCurrent &&
                  "bg-[var(--color-primary-tint)] text-[var(--color-shop-violet)]",
                !isDone &&
                  !isCurrent &&
                  "bg-[var(--color-canvas-mist)] text-[var(--color-muted-gray)]",
              )}
            >
              {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-[12px] leading-snug",
                isDone || isCurrent
                  ? "font-semibold text-[var(--color-ink-black)]"
                  : "text-[var(--color-muted-gray)]",
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
