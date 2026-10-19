import Image from "next/image";

export function EmptyState({
  heading,
  copy,
  onReset,
  showReset = true,
}: {
  heading?: string;
  copy?: string;
  onReset?: () => void;
  showReset?: boolean;
}) {
  return (
    <div className="flex flex-col items-center rounded-[28px] bg-[var(--color-pure-white)] p-10 text-center sm:p-14">
      <div className="relative mb-3 h-40 w-40">
        <Image
          src="/illustrations/Recycling-rafiki.svg"
          alt=""
          fill
          className="object-contain"
          aria-hidden="true"
        />
      </div>
      <h3 className="text-base font-semibold text-[var(--color-ink-black)]">
        {heading ?? "No items match your search"}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-[var(--color-muted-gray)]">
        {copy ?? "Try clearing filters, searching different keywords, or widening your district."}
      </p>
      {showReset && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 cursor-pointer rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 py-2 text-xs font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-black)] hover:bg-[var(--color-canvas-mist)]"
        >
          Reset all filters
        </button>
      )}
    </div>
  );
}
