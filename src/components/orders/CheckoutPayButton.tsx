"use client";

import { useState, useTransition } from "react";
import { startOrderCheckoutAction } from "@/features/orders/actions";

export function CheckoutPayButton({
  listingId,
  priceLabel,
}: {
  listingId: string;
  priceLabel: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pay = () => {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await startOrderCheckoutAction(listingId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      setError("The checkout did not open. Please try again.");
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={pay}
        disabled={isPending}
        className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
      >
        {isPending ? "Opening secure checkout…" : `Pay ${priceLabel} securely`}
      </button>
      <p className="text-center text-[11px] leading-relaxed text-[var(--color-muted-gray)]">
        You will be redirected to Bachs to complete payment. Pantaker holds the
        money until handover.
      </p>
      {error && (
        <p role="alert" className="text-[12px] leading-relaxed text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
