"use client";

import { useEffect } from "react";

export default function SellerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shop-card flex flex-col items-center px-6 py-14 text-center">
      <h1 className="font-brand-serif text-xl font-bold tracking-tight text-[var(--color-ink-black)]">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-[var(--color-muted-gray)]">
        We couldn&apos;t load your seller workspace. This is usually temporary.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
      >
        Try again
      </button>
    </div>
  );
}
