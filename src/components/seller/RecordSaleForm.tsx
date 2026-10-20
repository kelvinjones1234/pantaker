"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CaretDownIcon } from "@/components/brand/icons";
import { createSaleAction } from "@/features/sales/actions";
import type { EnquiryOption, SaleListingOption } from "@/features/sales/queries";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)] aria-[invalid=true]:border-[var(--color-error)]";

const selectClass =
  "h-[52px] w-full cursor-pointer appearance-none rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] pl-4 pr-11 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]";

/**
 * Records a new sale against one of the seller's own listings. Only listings
 * without an in-progress sale can be chosen, so the one-active-sale rule is
 * visible before submitting rather than only rejected afterwards.
 */
export function RecordSaleForm({
  listings,
  enquiries,
  isLive,
}: {
  listings: SaleListingOption[];
  enquiries: EnquiryOption[];
  isLive: boolean;
}) {
  const router = useRouter();
  const listingId = useId();
  const enquiryId = useId();
  const buyerId = useId();
  const priceId = useId();
  const notesId = useId();

  const [listing, setListing] = useState("");
  const [enquiry, setEnquiry] = useState("");
  const [buyerLabel, setBuyerLabel] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectable = useMemo(() => listings.filter((item) => !item.hasActiveSale), [listings]);
  const listingEnquiries = useMemo(
    () => enquiries.filter((item) => item.listing_id === listing),
    [enquiries, listing],
  );

  const onListingChange = (value: string) => {
    setListing(value);
    setEnquiry("");
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setNotice(null);

    if (!listing) {
      setError("Choose which listing sold.");
      return;
    }
    if (!isLive) {
      setNotice("Preview only — nothing was saved.");
      return;
    }

    const formData = new FormData();
    formData.set("listing_id", listing);
    formData.set("source_inquiry_id", enquiry);
    formData.set("buyer_label", buyerLabel);
    formData.set("agreed_price", price);
    formData.set("collection_notes", notes);

    startTransition(async () => {
      const res = await createSaleAction(formData);
      if (!res.ok) {
        setError(
          res.errors?.listing_id?.[0] ??
            res.errors?.agreed_price?.[0] ??
            res.error ??
            "Could not record the sale.",
        );
        return;
      }
      router.push(res.id ? `/seller/sales/${res.id}` : "/seller/sales");
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={listingId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
            Which listing sold?
          </label>
          <div className="relative">
            <select
              id={listingId}
              name="listing_id"
              value={listing}
              onChange={(event) => onListingChange(event.target.value)}
              className={selectClass}
            >
              <option value="">Choose a listing…</option>
              {selectable.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
          </div>
          {listings.length > 0 && selectable.length === 0 && (
            <p className="mt-1.5 text-[12px] text-[var(--color-muted-gray)]">
              Every listing already has a sale in progress. Finish or cancel one before recording a new sale.
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={enquiryId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
            Linked enquiry <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
          </label>
          <div className="relative">
            <select
              id={enquiryId}
              name="source_inquiry_id"
              value={enquiry}
              onChange={(event) => setEnquiry(event.target.value)}
              disabled={!listing}
              className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <option value="">No linked enquiry (buyer not signed in)</option>
              {listingEnquiries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.buyer_name ?? "Buyer"} — {item.message.slice(0, 60)}
                </option>
              ))}
            </select>
            <CaretDownIcon className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted-gray)]" />
          </div>
          <p className="mt-1.5 text-[12px] text-[var(--color-muted-gray)]">
            {listing && listingEnquiries.length === 0
              ? "No open enquiries on this listing. Record the buyer below instead."
              : "Linking an enquiry keeps the sale attached to the buyer who contacted you."}
          </p>
        </div>

        <div>
          <label htmlFor={buyerId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
            Buyer <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
          </label>
          <input
            id={buyerId}
            name="buyer_label"
            type="text"
            maxLength={80}
            value={buyerLabel}
            onChange={(event) => setBuyerLabel(event.target.value)}
            placeholder="e.g. Ada — bought in person"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor={priceId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
            Agreed price (₦) <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
          </label>
          <input
            id={priceId}
            name="agreed_price"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="45000"
            className={inputClass}
          />
          <p className="mt-1.5 text-[12px] text-[var(--color-muted-gray)]">
            What you recorded — Pantaker doesn&apos;t process or verify payments.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor={notesId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
            Collection notes <span className="font-normal text-[var(--color-muted-gray)]">(optional)</span>
          </label>
          <input
            id={notesId}
            name="collection_notes"
            type="text"
            maxLength={300}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. Pickup Saturday 2pm, Wuse 2"
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-[12px] text-[var(--color-ink-black)]">
          {notice}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={isPending || selectable.length === 0}
          className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isPending ? "Recording…" : "Record sale"}
        </button>
      </div>
    </form>
  );
}
