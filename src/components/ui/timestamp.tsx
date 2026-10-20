import { cn } from "@/lib/utils";
import {
  ADMIN_TIME_ZONE,
  formatAdminDate,
  formatAdminDateTime,
  isValidDateValue,
} from "@/lib/datetime";

/**
 * Renders a timestamp as a semantic `<time>` in the admin timezone. The absolute
 * value is the visible text; the full date+time and zone are in the title.
 */
export function Timestamp({
  value,
  mode = "date",
  className,
}: {
  value: string | null | undefined;
  mode?: "date" | "datetime";
  className?: string;
}) {
  if (!isValidDateValue(value)) {
    return <span className={cn("text-[var(--color-muted-gray)]", className)}>—</span>;
  }

  const label = mode === "datetime" ? formatAdminDateTime(value) : formatAdminDate(value);
  return (
    <time
      dateTime={value}
      title={`${formatAdminDateTime(value)} (${ADMIN_TIME_ZONE})`}
      className={cn("tabular", className)}
    >
      {label}
    </time>
  );
}
