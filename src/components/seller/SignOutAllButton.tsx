"use client";

import { useTransition } from "react";
import { LogoutIcon } from "@/components/brand/icons";
import { signOutAllDevicesAction } from "@/features/settings/actions";

/** Signs the account out on every device by invalidating its session version. */
export function SignOutAllButton({ isLive }: { isLive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending || !isLive}
      onClick={() => {
        if (!isLive) return;
        startTransition(async () => {
          await signOutAllDevicesAction();
        });
      }}
      className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoutIcon className="h-4 w-4" />
      {isPending ? "Signing out…" : "Sign out of all devices"}
    </button>
  );
}
