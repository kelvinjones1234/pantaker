"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferencesAction } from "@/features/notifications/actions";
import type { NotificationPreferenceKey } from "@/features/notifications/rules";
import type { NotificationPreferences } from "@/types/marketplace";

const PREFERENCE_ROWS: Array<{
  key: NotificationPreferenceKey;
  label: string;
  note: string;
}> = [
  {
    key: "messages",
    label: "New messages",
    note: "When someone messages you about one of your listings.",
  },
  {
    key: "sale_updates",
    label: "Sale updates",
    note: "When a sale you're part of changes status, such as reserved or completed.",
  },
  {
    key: "listing_updates",
    label: "Listing review outcomes",
    note: "When a listing is approved, or needs changes before it can go live.",
  },
];

/**
 * Preference switches for the in-app channel. Only event categories Pantaker
 * actually delivers are listed; account and security notices are always sent and
 * are therefore not switchable.
 */
export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  const [values, setValues] = useState<Record<NotificationPreferenceKey, boolean>>({
    messages: preferences.messages,
    sale_updates: preferences.sale_updates,
    listing_updates: preferences.listing_updates,
  });
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const toggle = (key: NotificationPreferenceKey) =>
    setValues((current) => ({ ...current, [key]: !current[key] }));

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setStatus(null);

    const formData = new FormData();
    for (const key of Object.keys(values) as NotificationPreferenceKey[]) {
      if (values[key]) formData.set(key, "on");
    }

    startTransition(async () => {
      const result = await updateNotificationPreferencesAction(formData);
      if (result.ok) {
        setStatus({ tone: "ok", text: result.message ?? "Preferences saved." });
      } else {
        setStatus({ tone: "error", text: result.error ?? "Could not save your preferences." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <div>
        {PREFERENCE_ROWS.map((row) => (
          <label
            key={row.key}
            className="flex cursor-pointer items-start justify-between gap-4 py-3 [&+&]:border-t [&+&]:border-[var(--color-faint-border)]"
          >
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-[var(--color-ink-black)]">
                {row.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
                {row.note}
              </span>
            </span>
            <span className="relative mt-0.5 inline-flex shrink-0">
              <input
                type="checkbox"
                checked={values[row.key]}
                onChange={() => toggle(row.key)}
                className="peer sr-only"
              />
              <span className="h-6 w-11 rounded-full bg-[var(--color-canvas-mist)] transition-colors duration-150 peer-checked:bg-[var(--color-shop-violet)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-shop-violet)] peer-focus-visible:ring-offset-2" />
              <span className="pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[var(--color-pure-white)] shadow-none transition-transform duration-150 peer-checked:translate-x-5" />
            </span>
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
        >
          {isPending ? "Saving…" : "Save preferences"}
        </button>
        {status && (
          <p
            role={status.tone === "error" ? "alert" : "status"}
            className={
              status.tone === "error"
                ? "text-[12px] text-[var(--color-error)]"
                : "text-[12px] text-[var(--color-ash-veil)]"
            }
          >
            {status.text}
          </p>
        )}
      </div>

      <p className="mt-4 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
        Account and security notices — like confirming a new email address — are always delivered and
        can&apos;t be switched off.
      </p>
    </form>
  );
}
