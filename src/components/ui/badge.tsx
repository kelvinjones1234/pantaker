import { cn } from "@/lib/utils";
import { CONDITION_LABELS, type Condition } from "@/types/marketplace";

/** Neutral Shop-system pills: white, hairline border, ink text.
 *  The single violet accent is reserved for actions, never status. */
const styles: Record<Condition, string> = {
  working: "bg-white text-[#000000] border-[#ebebeb]",
  used: "bg-white text-[#000000] border-[#ebebeb]",
  damaged: "bg-white text-[#000000] border-[#ebebeb]",
  for_parts: "bg-white text-[#000000] border-[#ebebeb]",
  scrap: "bg-white text-[#000000] border-[#ebebeb]",
  unclassified: "bg-white text-[#787574] border-[#ebebeb]",
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
    <span className="badge-condition bg-white text-[#202723]">
      {value.replace(/_/g, " ")}
    </span>
  );
}
