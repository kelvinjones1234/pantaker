import Link from "next/link";

export function BuyNowButton({
  listingId,
  priceLabel,
}: {
  listingId: string;
  priceLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Link
        href={`/checkout/${listingId}`}
        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
      >
        Buy now · {priceLabel}
      </Link>
      <p className="text-center text-[11px] leading-relaxed text-[var(--color-muted-gray)]">
        Payment is held by Pantaker until you collect the item.
      </p>
    </div>
  );
}
