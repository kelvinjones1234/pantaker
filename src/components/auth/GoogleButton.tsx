"use client";

import { useState, useTransition } from "react";
import { startGoogleSignIn } from "@/features/auth/actions";
import { AlertIcon, GoogleIcon } from "@/components/auth/icons";

export function GoogleButton({ next }: { next: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await startGoogleSignIn(next);
      if (result.ok) {
        window.location.assign(result.url);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex h-[52px] w-full max-w-[352px] sm:w-[352px] cursor-pointer items-center justify-center gap-2.5 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:bg-[var(--color-canvas-mist)] disabled:cursor-wait disabled:opacity-60"
      >
        <GoogleIcon className="h-[18px] w-[18px]" />
        {isPending ? "Connecting…" : "Continue with Google"}
      </button>
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-[var(--color-error)]">
          <AlertIcon className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
