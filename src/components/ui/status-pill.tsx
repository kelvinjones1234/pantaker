import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Neutral status pill. Only genuine problems add colour (warning/danger); a
 * normal or positive status stays white-on-hairline so the single violet accent
 * is never spent on status. Mirrors the seller pill styling.
 */
export type StatusTone = "neutral" | "warning" | "danger";

const toneStyles: Record<StatusTone, string> = {
  neutral:
    "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)]",
  warning: "border-transparent bg-[var(--color-warning-bg)] text-[var(--color-warning)]",
  danger: "border-transparent bg-[var(--color-error-bg)] text-[var(--color-error)]",
};

export function StatusPill({
  tone = "neutral",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: ReactNode;
}) {
  return <span className={cn("badge-condition", toneStyles[tone], className)}>{children}</span>;
}
