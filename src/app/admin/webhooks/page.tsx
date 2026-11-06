import type { Metadata } from "next";
import { requireAdminPermission } from "@/features/admin/authorization";
import { getRecentWebhookEvents } from "@/features/orders/queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { formatAdminDateTime } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Webhooks — Pantaker Admin",
  robots: { index: false, follow: false },
};

function stateFor(event: {
  processed_at: string | null;
  error: string | null;
}): { label: string; tone: string } {
  if (event.processed_at && event.error) {
    return { label: "Recorded, not applied", tone: "text-[var(--color-error)]" };
  }
  if (event.processed_at) {
    return { label: "Processed", tone: "text-[var(--color-ash-veil)]" };
  }
  if (event.error) {
    return { label: "Retrying", tone: "text-[var(--color-error)]" };
  }
  return { label: "Pending", tone: "text-[var(--color-muted-gray)]" };
}

export default async function AdminWebhooksPage() {
  await requireAdminPermission("payments.manage", "/admin/webhooks");
  const events = await getRecentWebhookEvents();

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Bachs webhooks"
        description="Recent payment-provider deliveries. Events that could not be applied are recorded here so they can be investigated."
      />

      {events.length === 0 ? (
        <p className="rounded-[20px] bg-[var(--color-pure-white)] p-6 text-sm text-[var(--color-ash-veil)]">
          No webhook deliveries recorded yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => {
            const state = stateFor(event);
            return (
              <li
                key={event.id}
                className="rounded-[20px] bg-[var(--color-pure-white)] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[var(--color-ink-black)]">
                      {event.type}
                    </p>
                    <p className="mt-1 text-[12px] text-[var(--color-muted-gray)]">
                      {formatAdminDateTime(event.received_at)} · attempt{" "}
                      {event.attempts}
                    </p>
                    <p className="mt-0.5 break-all text-[11px] text-[var(--color-ash-veil)]">
                      {event.id}
                    </p>
                  </div>
                  <span className={`text-[11px] font-semibold ${state.tone}`}>
                    {state.label}
                  </span>
                </div>
                {event.error && (
                  <p className="mt-3 text-[12px] leading-relaxed text-[var(--color-error)]">
                    {event.error}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
