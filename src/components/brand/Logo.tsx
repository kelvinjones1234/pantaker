import { cn } from "@/lib/utils";

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={cn("h-8 w-8", className)} aria-hidden="true">
      <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="3.5" strokeDasharray="78 30" strokeLinecap="round" transform="rotate(-40 20 20)" />
      <circle cx="20" cy="20" r="8.5" fill="currentColor" opacity="0.16" />
      <path d="M20 14.5v5.2l3.8 2.6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({
  variant = "dark",
  compact = false,
  className,
}: {
  variant?: "dark" | "light" | "mono";
  compact?: boolean;
  className?: string;
}) {
  const color =
    variant === "light" ? "text-white" : variant === "mono" ? "text-current" : "text-[#000000]";
  return (
    <span className={cn("inline-flex items-center gap-2", color, className)} role="img" aria-label="Pantaker home">
      <Mark />
      {!compact && (
        <span className="text-lg font-extrabold tracking-tight">
          PANTAKER
          <span className="text-[#5433eb]">.</span>
        </span>
      )}
    </span>
  );
}
