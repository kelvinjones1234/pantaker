import Link from "next/link";

/** Compact metric tile. Value is always a real, seller-scoped count. */
export function SellerMetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-gray)]">
        {label}
      </span>
      <span className="font-sans tabular mt-2 text-3xl font-semibold tracking-tight text-[var(--color-ink-black)]">
        {value}
      </span>
      {hint && <span className="mt-1 text-[12px] text-[var(--color-muted-gray)]">{hint}</span>}
    </>
  );

  const className =
    "shop-card flex flex-1 flex-col p-5 transition-transform duration-150" +
    (href ? " hover:-translate-y-0.5" : "");

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
