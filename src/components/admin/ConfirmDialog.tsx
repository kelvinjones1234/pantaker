"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

/**
 * Accessible confirmation dialog for consequential actions. Renders nothing when
 * closed. While open it is a modal: focus moves into the dialog, Tab is trapped,
 * Escape cancels, and focus returns to the element that opened it. It performs no
 * validation and runs no business logic — `onConfirm` is supplied by the caller,
 * which is responsible for the server-side action.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  pending = false,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional form content rendered between the message and the buttons. */
  children?: ReactNode;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--overlay-ink-45)] p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="shop-card w-full max-w-md p-6"
      >
        <div className="flex items-start gap-3">
          {tone === "danger" && (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-error-bg)]">
              <AlertIcon className="h-5 w-5 text-[var(--color-error)]" />
            </span>
          )}
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-brand-serif text-lg font-bold tracking-tight text-[var(--color-ink-black)]"
            >
              {title}
            </h2>
            <p
              id={descriptionId}
              className="mt-1.5 text-[13px] leading-relaxed text-[var(--color-muted-gray)]"
            >
              {description}
            </p>
          </div>
        </div>

        {children && <div className="mt-4">{children}</div>}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] px-5 text-sm font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={cn(
              "inline-flex h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold text-[var(--color-pure-white)] transition-colors duration-150 disabled:cursor-wait disabled:opacity-60",
              tone === "danger"
                ? "bg-[var(--color-error)] hover:opacity-90"
                : "bg-[var(--color-shop-violet)] hover:bg-[var(--color-primary-hover)]",
            )}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
