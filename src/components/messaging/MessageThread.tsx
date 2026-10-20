"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AlertIcon, SendIcon } from "@/components/brand/icons";
import {
  fetchConversationMessagesAction,
  markConversationReadAction,
  sendMessageAction,
} from "@/features/messaging/actions";
import { cn, timeAgo } from "@/lib/utils";
import type { Message } from "@/types/marketplace";

/**
 * Conversation thread with a composer. The client polls for new messages while
 * the tab is visible, so no third-party realtime connection or public table
 * access is required. No placeholder messages are ever injected — an empty
 * thread shows an empty state.
 */
export function MessageThread({
  conversationId,
  currentUserId,
  initialMessages,
  canSend,
  blockReason,
  otherName,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: Message[];
  canSend: boolean;
  blockReason: string | null;
  otherName: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const seen = useRef(new Set(initialMessages.map((message) => message.id)));
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const append = (message: Message) => {
    if (seen.current.has(message.id)) return;
    seen.current.add(message.id);
    setMessages((prev) => [...prev, message]);
  };

  // Mark the caller's side read once the thread is opened.
  useEffect(() => {
    void markConversationReadAction(conversationId).catch(() => undefined);
  }, [conversationId]);

  // Poll for new messages while the tab is visible. The polling interval is
  // paused when the user switches away so background tabs stay quiet.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (document.visibilityState !== "visible") {
        timer = setTimeout(poll, 5000);
        return;
      }
      const latest = [...seen.current];
      const lastId = latest[latest.length - 1];
      const last = messages.find((message) => message.id === lastId);
      const result = await fetchConversationMessagesAction(
        conversationId,
        last?.created_at,
      ).catch(() => null);
      if (cancelled) return;
      if (result?.ok) {
        for (const message of result.messages) append(message);
        if (result.messages.length > 0) {
          void markConversationReadAction(conversationId).catch(
            () => undefined,
          );
        }
      }
      timer = setTimeout(poll, 5000);
    };

    timer = setTimeout(poll, 5000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const ordered = useMemo(
    () =>
      [...messages].sort((a, b) =>
        a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
      ),
    [messages],
  );

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending || !canSend) return;
    const body = draft.trim();
    if (!body) return;
    setError(null);

    const formData = new FormData();
    formData.set("inquiry_id", conversationId);
    formData.set("body", body);

    startTransition(async () => {
      const res = await sendMessageAction(formData);
      if (!res.ok) {
        setError(
          res.errors?.body?.[0] ??
            res.error ??
            "Your message couldn't be sent.",
        );
        return;
      }
      if (res.message) append(res.message);
      setDraft("");
    });
  };

  return (
    <div className="flex min-h-0 flex-col">
      <div
        className="flex-1 overflow-y-auto px-1 py-4"
        role="log"
        aria-label="Conversation messages"
      >
        {ordered.length === 0 ? (
          <p className="py-10 text-center text-[13px] text-[var(--color-muted-gray)]">
            No messages yet. Say hello to start the conversation.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ordered.map((message) => {
              const mine = message.sender_id === currentUserId;
              return (
                <li
                  key={message.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[85%] sm:max-w-[70%]")}>
                    <div
                      className={cn(
                        "rounded-[20px] px-4 py-2.5 text-[13px] leading-relaxed",
                        mine
                          ? "bg-[var(--color-shop-violet)] text-[var(--color-pure-white)]"
                          : "bg-[var(--color-canvas-mist)] text-[var(--color-ink-black)]",
                      )}
                    >
                      <span className="sr-only">
                        {mine ? "You said" : `${otherName} said`}:{" "}
                      </span>
                      {message.body}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[11px] text-[var(--color-muted-gray)]",
                        mine ? "text-right" : "text-left",
                      )}
                      title={new Date(message.created_at).toLocaleString(
                        "en-NG",
                      )}
                    >
                      {timeAgo(message.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form
          onSubmit={onSubmit}
          className="mt-2 flex items-end gap-2 border-t border-[var(--color-faint-border)] pt-4"
        >
          <label htmlFor={`message-${conversationId}`} className="sr-only">
            Write a message
          </label>
          <textarea
            id={`message-${conversationId}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={1}
            maxLength={2000}
            placeholder={`Message ${otherName}…`}
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-4 py-3 text-[13px] leading-relaxed text-[var(--color-ink-black)] outline-none transition-colors duration-150 placeholder:text-[var(--color-muted-gray)] hover:border-[var(--color-ink-30)] focus:border-[var(--color-shop-violet)]"
          />
          <button
            type="submit"
            disabled={isPending || draft.trim().length === 0}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-shop-violet)] text-[var(--color-pure-white)] transition-colors duration-200 hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
      ) : (
        <p className="mt-2 flex items-center gap-2 rounded-[16px] bg-[var(--color-canvas-mist)] px-4 py-3 text-[12px] text-[var(--color-ash-veil)]">
          <AlertIcon className="h-4 w-4 shrink-0" />
          {blockReason ?? "You can't send messages in this conversation."}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 text-[12px] text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  );
}
