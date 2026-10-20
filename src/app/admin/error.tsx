"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

export default function AdminError({
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
    <ErrorState
      title="Couldn't load this admin view"
      description="Something went wrong loading the data for this page. This is usually temporary."
    >
      <button
        type="button"
        onClick={reset}
        className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)]"
      >
        Try again
      </button>
    </ErrorState>
  );
}
