"use client";

import "./globals.css";
import { useEffect } from "react";
import { Logo } from "@/components/brand/Logo";
import { ErrorState } from "@/components/ui/error-state";

export default function GlobalError({
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
    <html lang="en-NG">
      <body className="font-sans">
        <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--shop-canvas)] px-4 py-12">
          <a href="/" aria-label="Pantaker home">
            <Logo />
          </a>
          <ErrorState
            title="Pantaker couldn't load"
            description="Something interrupted the app before it could start. Try again, or open the marketplace."
            className="mt-6 w-full max-w-lg"
          >
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-150 hover:bg-[var(--color-primary-hover)]"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
            >
              Go home
            </a>
          </ErrorState>
        </div>
      </body>
    </html>
  );
}
