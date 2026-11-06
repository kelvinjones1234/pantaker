"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentReturnNotice({
  requested,
  paid,
  reference,
}: {
  requested: boolean;
  paid: boolean;
  reference: string | null;
}) {
  const router = useRouter();
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    if (!requested || paid) return;
    const timer = window.setInterval(() => {
      setChecks((value) => {
        const next = value + 1;
        if (next >= 20) window.clearInterval(timer);
        return next;
      });
      router.refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paid, requested, router]);

  if (!requested) return null;

  if (paid) {
    return (
      <p
        role="status"
        className="rounded-[16px] bg-[var(--color-success-bg)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-success)]"
      >
        Payment confirmed. Pantaker is holding your money until you confirm
        collection.
      </p>
    );
  }

  return (
    <div
      role="status"
      className="rounded-[16px] bg-[var(--color-canvas-mist)] px-4 py-3 text-[12px] leading-relaxed text-[var(--color-ash-veil)]"
    >
      <p className="font-semibold text-[var(--color-ink-black)]">
        Confirming your payment…
      </p>
      <p className="mt-1">
        {checks >= 20
          ? "This is taking longer than usual. Do not pay again. Contact support with your order number if it does not update shortly."
          : "This usually takes a few seconds. We will update this page automatically."}
      </p>
      {reference && (
        <p className="mt-1 text-[11px] text-[var(--color-muted-gray)]">
          Payment reference: {reference}
        </p>
      )}
    </div>
  );
}
