import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, MapPinIcon, ShieldIcon } from "@/components/brand/icons";
import { CheckoutPayButton } from "@/components/orders/CheckoutPayButton";
import { OrderStatusPill } from "@/components/orders/OrderStatusPill";
import { StorageImage } from "@/components/ui/storage-image";
import { requireUser } from "@/features/auth/authorization";
import { getListingDetail } from "@/features/listings/queries";
import {
  getBuyerOrderForListing,
  getListingPurchaseState,
} from "@/features/orders/queries";
import { formatKobo } from "@/lib/bachs/format";

export const metadata: Metadata = { title: "Checkout — Pantaker" };

const primaryButton =
  "inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]";

function CheckoutNotice({
  title,
  message,
  href,
  action,
}: {
  title: string;
  message: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="shop-card p-6">
      <h2 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
        {title}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
        {message}
      </p>
      {href && action && (
        <Link href={href} className={`${primaryButton} mt-5`}>
          {action}
        </Link>
      )}
    </div>
  );
}

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser(`/checkout/${id}`);
  const listing = await getListingDetail(id);
  if (!listing) notFound();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
        <CheckoutNotice
          title="Sign in to continue"
          message="Pantaker needs an account so you can track this purchase and use your pickup code."
          href={`/login?next=${encodeURIComponent(`/checkout/${id}`)}`}
          action="Sign in or create an account"
        />
      </div>
    );
  }

  const [purchaseState, viewerOrder] = await Promise.all([
    !listing.sample && listing.seller_id
      ? getListingPurchaseState(listing.id, listing.seller_id)
      : Promise.resolve(null),
    !listing.sample
      ? getBuyerOrderForListing(listing.id, user.id)
      : Promise.resolve(null),
  ]);

  const isOwner = Boolean(listing.seller_id && listing.seller_id === user.id);
  const priceKobo =
    listing.price == null ? null : Math.round(listing.price * 100);
  const hasPayablePrice =
    listing.pricing_type === "fixed" &&
    priceKobo != null &&
    Number.isSafeInteger(priceKobo) &&
    priceKobo > 0;
  const priceLabel = priceKobo == null ? "—" : formatKobo(priceKobo);
  const sellerName =
    listing.seller?.display_name ??
    (listing.seller?.username ? `@${listing.seller.username}` : "Pantaker seller");
  const sellerReady = purchaseState?.sellerReady === true;
  const blockedByOtherOrder =
    purchaseState?.hasActiveOrder === true && viewerOrder == null;
  const blockedBySale = purchaseState?.hasActiveSale === true;
  const canPay =
    !listing.sample &&
    !isOwner &&
    listing.item_status === "published" &&
    hasPayablePrice &&
    sellerReady &&
    !blockedBySale &&
    !blockedByOtherOrder;
  const canResume =
    viewerOrder?.status === "pending_payment" &&
    Boolean(viewerOrder.checkoutUrl);
  const hasOpenOrder = viewerOrder?.status === "pending_payment";
  const hasCompletedHandover = viewerOrder && !hasOpenOrder;

  let notice: { title: string; message: string; href?: string; action?: string } | null =
    null;
  if (listing.sample) {
    notice = {
      title: "Sample listing",
      message: "Online checkout is available on real marketplace listings.",
      href: `/marketplace/listing/${listing.id}`,
      action: "Back to listing",
    };
  } else if (isOwner) {
    notice = {
      title: "This is your listing",
      message: "You cannot buy your own item.",
      href: `/seller/listings/${listing.id}/edit`,
      action: "Manage listing",
    };
  } else if (hasCompletedHandover) {
    notice = {
      title: "You already have an order",
      message: "Open your order to see the pickup code and current status.",
      href: `/orders/${viewerOrder.id}`,
      action: "View your order",
    };
  } else if (!hasOpenOrder && listing.item_status !== "published") {
    notice = {
      title: "This item is not available",
      message: "The seller has closed or paused this listing.",
      href: `/marketplace/listing/${listing.id}`,
      action: "Back to listing",
    };
  } else if (!hasOpenOrder && !hasPayablePrice) {
    notice = {
      title: "Online checkout is not available",
      message:
        "This item is not fixed-price. Message the seller to agree a price and collection.",
      href: `/marketplace/listing/${listing.id}`,
      action: "Message the seller",
    };
  } else if (!hasOpenOrder && blockedBySale) {
    notice = {
      title: "This item is already reserved",
      message:
        "The seller is handling a sale for this item. It cannot be bought online right now.",
      href: `/marketplace/listing/${listing.id}`,
      action: "Back to listing",
    };
  } else if (!hasOpenOrder && blockedByOtherOrder) {
    notice = {
      title: "Someone else is checking out",
      message:
        "Another buyer is currently paying for this item. Check back if their checkout expires.",
      href: `/marketplace/listing/${listing.id}`,
      action: "Back to listing",
    };
  } else if (!hasOpenOrder && !sellerReady) {
    notice = {
      title: "This seller is not accepting online payments yet",
      message:
        "The seller needs to finish their payment setup before Pantaker can protect this purchase. Message them to arrange a sale.",
      href: `/marketplace/listing/${listing.id}`,
      action: "Back to listing",
    };
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-10">
      <Link
        href={`/marketplace/listing/${listing.id}`}
        className="inline-flex min-h-11 items-center text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
      >
        ← Back to listing
      </Link>

      <header className="mt-2">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--color-ash-veil)] uppercase">
          Secure checkout
        </p>
        <h1 className="font-brand-serif mt-1 text-2xl font-bold tracking-tight text-[var(--color-ink-black)] sm:text-3xl">
          Review your purchase
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
          Your payment is held by Pantaker, not sent directly to the seller.
          Confirm receipt after collection, or the seller is paid 72 hours after
          verified handover if you do not raise a problem.
        </p>
      </header>

      {query.cancelled === "1" && (
        <p
          role="status"
          className="mt-5 rounded-[16px] bg-[var(--color-warning-bg)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-warning)]"
        >
          Your payment was cancelled. Nothing was charged. You can try again below.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-5">
          <section className="shop-card p-5" aria-labelledby="checkout-item-heading">
            <h2
              id="checkout-item-heading"
              className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase"
            >
              Item
            </h2>
            <div className="mt-4 flex items-start gap-4">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[20px] bg-[var(--color-canvas-mist)]">
                <StorageImage
                  src={listing.images[0]?.url}
                  alt={listing.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                  fallback={
                    <span className="flex h-full items-center justify-center p-2 text-center text-[11px] text-[var(--color-muted-gray)]">
                      No photo
                    </span>
                  }
                />
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[var(--color-ink-black)]">
                  {listing.title}
                </p>
                <p className="mt-1 text-[12px] text-[var(--color-ash-veil)]">
                  Sold by {sellerName}
                </p>
                <p className="mt-2 flex items-center gap-1 text-[12px] text-[var(--color-muted-gray)]">
                  <MapPinIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {listing.area ? `${listing.area}, Abuja` : listing.city}
                </p>
              </div>
            </div>

            {listing.pickup_notes && (
              <div className="mt-5">
                <h3 className="text-[12px] font-semibold text-[var(--color-ink-black)]">
                  Collection details
                </h3>
                <p className="mt-1 whitespace-pre-line text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                  {listing.pickup_notes}
                </p>
              </div>
            )}
          </section>

          <section className="shop-card p-5" aria-labelledby="protection-heading">
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-[var(--color-shop-violet)]" />
              <h2
                id="protection-heading"
                className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase"
              >
                How buyer protection works
              </h2>
            </div>
            <ol className="mt-4 flex flex-col gap-3">
              {[
                "Pay securely through Bachs. Pantaker holds the seller's share.",
                "Collect the item and share your 6-digit pickup code with the seller.",
                "Confirm receipt to pay the seller, or open an issue before release.",
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-tint)] text-[11px] font-semibold text-[var(--color-shop-violet)]">
                    {index + 1}
                  </span>
                  <span className="text-[13px] leading-relaxed text-[var(--color-ash-veil)]">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 flex items-center gap-1.5 text-[11px] leading-relaxed text-[var(--color-ash-veil)]">
              <CheckIcon className="h-3.5 w-3.5 text-[var(--color-shop-violet)]" />
              Local pickup only. No shipping is arranged through Pantaker.
            </p>
          </section>
        </div>

        <aside className="shop-card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="text-[12px] font-semibold tracking-[0.12em] text-[var(--color-ash-veil)] uppercase">
            Order summary
          </h2>
          <dl className="mt-4 flex flex-col gap-3 text-[13px]">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--color-ash-veil)]">Item price</dt>
              <dd className="font-semibold text-[var(--color-ink-black)]">
                {priceLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-[var(--color-ash-veil)]">Buyer fee</dt>
              <dd className="text-[var(--color-ink-black)]">₦0</dd>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--color-faint-border)] pt-3">
              <dt className="font-semibold text-[var(--color-ink-black)]">Total</dt>
              <dd className="font-semibold text-[var(--color-ink-black)]">
                {priceLabel}
              </dd>
            </div>
          </dl>

          <div className="mt-5">
            {viewerOrder ? (
              <div className="flex flex-col gap-2">
                <OrderStatusPill status={viewerOrder.status} />
                <p className="text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                  {hasOpenOrder
                    ? "Your checkout is still open. Finish payment to hold this item."
                    : "This item is already on your order."}
                </p>
                {canResume ? (
                  <a href={viewerOrder.checkoutUrl ?? "#"} className={primaryButton}>
                    Resume payment
                  </a>
                ) : hasOpenOrder && canPay ? (
                  <CheckoutPayButton
                    listingId={listing.id}
                    priceLabel={priceLabel}
                  />
                ) : (
                  <Link
                    href={`/orders/${viewerOrder.id}`}
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--color-canvas-mist)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:bg-[var(--color-primary-tint)]"
                  >
                    View your order
                  </Link>
                )}
              </div>
            ) : notice ? (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
                  {notice.title}
                </p>
                <p className="text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                  {notice.message}
                </p>
                {notice.href && notice.action && (
                  <Link href={notice.href} className={primaryButton}>
                    {notice.action}
                  </Link>
                )}
              </div>
            ) : canPay ? (
              <CheckoutPayButton
                listingId={listing.id}
                priceLabel={priceLabel}
              />
            ) : (
              <p className="text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
                Online checkout is unavailable for this listing. Go back to the
                listing to message the seller.
              </p>
            )}
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-ash-veil)]">
            Payments are processed by Bachs. Pantaker is not a bank or escrow
            provider; this is buyer protection.
          </p>
        </aside>
      </div>
    </div>
  );
}
