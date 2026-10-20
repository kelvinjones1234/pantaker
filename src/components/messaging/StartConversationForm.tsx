"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversationAction } from "@/features/messaging/actions";
import { SendIcon } from "@/components/brand/icons";

/**
 * Starts a conversation from a listing. The buyer is the session user; the
 * seller is resolved from the listing row on the server. On success the buyer is
 * taken straight into the thread.
 */
export function StartConversationForm({
  listingId,
  sellerName,
  isLive,
}: {
  listingId: string;
  sellerName: string;
  isLive: boolean;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setNotice(null);

    const message = body.trim();
    if (!message) {
      setError("Write a message to the seller.");
      return;
    }
    if (!isLive) {
      setNotice("Preview only — nothing was sent.");
      return;
    }

    const formData = new FormData();
    formData.set("listing_id", listingId);
    formData.set("body", message);

    startTransition(async () => {
      const res = await startConversationAction(formData);
      if (!res.ok) {
        setError(res.errors?.body?.[0] ?? res.error ?? "Your message couldn't be sent.");
        return;
      }
      router.push(res.id ? `/messages/${res.id}` : "/messages");
    });
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <label htmlFor="start-message" className="text-[13px] font-semibold text-[var(--color-ink-black)]">
        Message {sellerName}
      </label>
      <textarea
        id="start-message"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Is this still available?"
        className="resize-y rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 py-3 text-[13px] text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
      />
      {error && (
        <p role="alert" className="text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-[12px] text-[var(--color-ash-veil)]">
          {notice}
        </p>
      )}
      <button
        type="submit"
        disabled={isPending || body.trim().length === 0}
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--color-shop-violet)] px-6 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <SendIcon className="h-4 w-4" />
        {isPending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
