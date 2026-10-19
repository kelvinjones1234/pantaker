export interface ChipOption {
  value: string;
  label: string;
}

export function FilterChips({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-muted-gray)]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
        {options.map((option) => {
          const isActive = option.value === value;
          return (
            <button
              key={option.value || "any"}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={isActive}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium outline-none transition-colors duration-150 focus-visible:border-[var(--color-shop-violet)] ${
                isActive
                  ? "border-[var(--color-ink-black)] bg-[var(--color-ink-black)] text-[var(--color-pure-white)]"
                  : "border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] hover:border-[var(--color-ink-30)]"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
