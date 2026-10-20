"use client";

import { useId, useState, useTransition } from "react";
import { CaretDownIcon, CheckIcon } from "@/components/brand/icons";
import { ABUJA_AREAS, ALL_ABUJA } from "@/lib/areas";
import { updateListingPreferencesAction } from "@/features/settings/actions";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const AREA_OPTIONS = ABUJA_AREAS.filter((area) => area.name !== ALL_ABUJA).map((area) => area.name);

/**
 * Defaults applied to every new listing. Both values are read by the `/sell`
 * form, so this is a real preference — never a decorative toggle.
 */
export function ListingPreferencesForm({
  initial,
  isLive,
}: {
  initial: { default_area: string | null; default_pickup_notes: string | null };
  isLive: boolean;
}) {
  const areaId = useId();
  const notesId = useId();
  const [area, setArea] = useState(initial.default_area ?? "");
  const [notes, setNotes] = useState(initial.default_pickup_notes ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setNotice(null);

    if (!isLive) {
      setNotice("Preview only — nothing was saved.");
      return;
    }

    const formData = new FormData();
    formData.set("default_area", area);
    formData.set("default_pickup_notes", notes);

    startTransition(async () => {
      const res = await updateListingPreferencesAction(formData);
      if (!res.ok) {
        setError(
          res.errors?.default_area?.[0] ??
            res.errors?.default_pickup_notes?.[0] ??
            res.error ??
            "Could not save your preferences.",
        );
        return;
      }
      setNotice(res.message ?? "Listing preferences saved.");
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor={areaId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
          Default district
        </label>
        <div className="relative">
          <select
            id={areaId}
            name="default_area"
            value={area}
            onChange={(event) => setArea(event.target.value)}
            className="h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
          >
            <option value="">No default — choose per listing</option>
            {AREA_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
        </div>
        <p className="mt-1.5 text-[12px] text-[var(--color-muted-gray)]">
          Pre-fills the district on new listings. Pantaker currently serves Abuja only.
        </p>
      </div>

      <div>
        <label htmlFor={notesId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
          Default collection notes
        </label>
        <input
          id={notesId}
          name="default_pickup_notes"
          type="text"
          maxLength={160}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="e.g. Pickup at workshop, daytime only"
          className={inputClass}
        />
        <p className="mt-1.5 text-[12px] text-[var(--color-muted-gray)]">
          Pre-fills collection notes so buyers know where and when to collect.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[16px] bg-[var(--color-primary-tint)] px-4 py-3 text-[12px] text-[var(--color-ink-black)]"
        >
          <CheckIcon className="h-4 w-4 shrink-0 text-[var(--color-shop-violet)]" />
          {notice}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
        >
          {isPending ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </form>
  );
}
