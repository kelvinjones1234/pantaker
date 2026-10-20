"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@/components/brand/icons";
import { transitionsFromSale, type SaleTransition } from "@/features/sales/lifecycle";
import { updateSaleDetailsAction, updateSaleStatusAction } from "@/features/sales/actions";
import { cn } from "@/lib/utils";
import type { SaleStatus } from "@/types/marketplace";

const inputClass =
  "h-[52px] w-full rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 text-sm text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]";

/**
 * Seller controls for one sale: edit the recorded details, and move the sale
 * through the lifecycle. Status buttons are derived from the lifecycle table, so
 * the UI can never offer a transition the server would reject. Cancel/completion
 * ask for an inline confirmation first; arranging collection requires notes.
 */
export function SaleControls({
  saleId,
  status,
  buyerLabel,
  agreedPrice,
  collectionNotes,
  isLive,
}: {
  saleId: string;
  status: SaleStatus;
  buyerLabel: string | null;
  agreedPrice: number | null;
  collectionNotes: string | null;
  isLive: boolean;
}) {
  const router = useRouter();
  const buyerId = useId();
  const priceId = useId();
  const notesId = useId();
  const transitions = transitionsFromSale(status);

  const [buyer, setBuyer] = useState(buyerLabel ?? "");
  const [price, setPrice] = useState(agreedPrice != null ? String(agreedPrice) : "");
  const [notes, setNotes] = useState(collectionNotes ?? "");
  const [pendingTransition, setPendingTransition] = useState<SaleTransition | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const saveDetails = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setNotice(null);
    if (!isLive) {
      setNotice("Preview only — nothing was saved.");
      return;
    }

    const formData = new FormData();
    formData.set("buyer_label", buyer);
    formData.set("agreed_price", price);
    formData.set("collection_notes", notes);

    startTransition(async () => {
      const res = await updateSaleDetailsAction(saleId, formData);
      if (!res.ok) {
        setError(res.errors?.agreed_price?.[0] ?? res.error ?? "Could not save the sale.");
        return;
      }
      setNotice(res.message ?? "Sale details saved.");
      router.refresh();
    });
  };

  const runTransition = (transition: SaleTransition) => {
    if (isPending) return;
    setError(null);
    setNotice(null);

    if (transition.requiresCollectionNotes && !notes.trim()) {
      setError("Add where and when the buyer will collect before arranging collection.");
      return;
    }
    if (!isLive) {
      setPendingTransition(null);
      setNotice("Preview only — nothing was saved.");
      return;
    }

    const formData = new FormData();
    formData.set("status", transition.to);
    formData.set("collection_notes", notes);

    startTransition(async () => {
      const res = await updateSaleStatusAction(saleId, formData);
      setPendingTransition(null);
      if (!res.ok) {
        setError(res.errors?.collection_notes?.[0] ?? res.error ?? "Could not update the sale.");
        return;
      }
      setNotice(res.message ?? "Sale updated.");
      router.refresh();
    });
  };

  const onTransitionClick = (transition: SaleTransition) => {
    if (transition.confirm) {
      setError(null);
      setNotice(null);
      setPendingTransition(transition);
      return;
    }
    runTransition(transition);
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={saveDetails} noValidate className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={buyerId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
              Buyer
            </label>
            <input
              id={buyerId}
              name="buyer_label"
              type="text"
              maxLength={80}
              value={buyer}
              onChange={(event) => setBuyer(event.target.value)}
              placeholder="e.g. Ada — bought in person"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor={priceId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
              Agreed price (₦)
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
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={notesId} className="mb-1.5 block text-xs font-semibold text-[var(--color-ink-black)]">
              Collection notes
            </label>
            <input
              id={notesId}
              name="collection_notes"
              type="text"
              maxLength={300}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Where and when the buyer will collect"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex h-[52px] w-full cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-6 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:border-[var(--color-ink-30)] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {isPending ? "Saving…" : "Save details"}
          </button>
        </div>
      </form>

      {transitions.length > 0 && (
        <div className="border-t border-[var(--color-faint-border)] pt-5">
          <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">Move this sale forward</p>
          <p className="mt-0.5 text-[12px] text-[var(--color-muted-gray)]">
            Only the steps that apply to a {status.replace(/_/g, " ")} sale are shown.
          </p>

          {pendingTransition ? (
            <div className="mt-4 flex flex-col gap-3 rounded-[16px] bg-[var(--color-primary-tint)] p-4">
              <p className="text-[13px] text-[var(--color-ink-black)]">{pendingTransition.description}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runTransition(pendingTransition)}
                  disabled={isPending}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-60"
                >
                  {isPending ? "Working…" : `Yes, ${pendingTransition.label.toLowerCase()}`}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingTransition(null)}
                  disabled={isPending}
                  className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-200 hover:border-[var(--color-ink-30)] disabled:opacity-60"
                >
                  Keep as is
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-3">
              {transitions.map((transition) => (
                <button
                  key={transition.to}
                  type="button"
                  onClick={() => onTransitionClick(transition)}
                  disabled={isPending}
                  className={cn(
                    "inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 disabled:cursor-wait disabled:opacity-60",
                    transition.tone === "danger"
                      ? "border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-error)] hover:border-[var(--color-error)]"
                      : "bg-[var(--color-shop-violet)] text-[var(--color-pure-white)] hover:bg-[var(--color-primary-hover)]",
                  )}
                >
                  {transition.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

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
    </div>
  );
}
