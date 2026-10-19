import { cn } from "@/lib/utils";
import { CONDITION_LABELS, type Condition } from "@/types/marketplace";

/** Neutral Shop-system pills: white, hairline border, ink text.
 *  The single violet accent is reserved for actions, never status. */
const styles: Record<Condition, string> = {
  working: "bg-[var(--color-pure-white)] text-[var(--color-ink-black)] border-[var(--color-faint-border)]",
  partially_usable: "bg-[var(--color-pure-white)] text-[var(--color-ink-black)] border-[var(--color-faint-border)]",
  used: "bg-[var(--color-pure-white)] text-[var(--color-ink-black)] border-[var(--color-faint-border)]",
  damaged: "bg-[var(--color-pure-white)] text-[var(--color-ink-black)] border-[var(--color-faint-border)]",
  for_parts: "bg-[var(--color-pure-white)] text-[var(--color-ink-black)] border-[var(--color-faint-border)]",
  scrap: "bg-[var(--color-pure-white)] text-[var(--color-ink-black)] border-[var(--color-faint-border)]",
  unclassified: "bg-[var(--color-pure-white)] text-[var(--color-muted-gray)] border-[var(--color-faint-border)]",
};

export function ConditionBadge({ value, className }: { value: Condition; className?: string }) {
  return (
    <span className={cn("badge-condition", styles[value], className)}>
      {CONDITION_LABELS[value]}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className="badge-condition bg-[var(--color-pure-white)] text-[var(--color-ink-black)]">
      {value.replace(/_/g, " ")}
    </span>
  );
}
