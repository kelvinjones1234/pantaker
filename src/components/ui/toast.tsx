"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertIcon, BellIcon, CheckIcon, XIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

export type ToastTone = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Errors default to a longer window. */
  duration?: number;
}

export interface ToastItem extends Required<Pick<ToastOptions, "title" | "tone" | "duration">> {
  id: string;
  description?: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
let toastSequence = 0;

function nextToastId() {
  toastSequence += 1;
  return `toast-${Date.now()}-${toastSequence}`;
}

const TONE_ICON = {
  success: CheckIcon,
  error: AlertIcon,
  info: BellIcon,
} as const;

const TONE_COLOR: Record<ToastTone, string> = {
  success: "text-[var(--color-success-bg)]",
  error: "text-[var(--color-error-bg)]",
  info: "text-[var(--color-primary-tint)]",
};

export function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [phase, setPhase] = useState<"entering" | "open" | "closing">("entering");
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);
  const remainingRef = useRef(item.duration);
  const startedAtRef = useRef(0);
  const closingRef = useRef(false);

  const beginDismiss = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setPhase("closing");
    window.setTimeout(() => onDismiss(item.id), 190);
  }, [item.id, onDismiss]);

  const startTimer = useCallback(() => {
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(beginDismiss, remainingRef.current);
  }, [beginDismiss]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPhase("open"));
    startTimer();
    return () => {
      window.cancelAnimationFrame(frame);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [startTimer]);

  const pauseTimer = () => {
    if (!timerRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (Date.now() - startedAtRef.current),
    );
    setPaused(true);
  };

  const resumeTimer = () => {
    if (!paused || closingRef.current) return;
    setPaused(false);
    startTimer();
  };

  const Icon = TONE_ICON[item.tone];

  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocus={pauseTimer}
      onBlur={resumeTimer}
      className={cn(
        "pointer-events-auto relative w-full rounded-[20px] bg-[var(--color-ink-black)] p-4 pr-12 text-[var(--color-pure-white)] transition-[opacity,transform] duration-200 ease-out",
        phase === "open" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--overlay-paper-10)]">
          <Icon className={cn("h-4 w-4", TONE_COLOR[item.tone])} />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[13px] leading-snug font-semibold">{item.title}</p>
          {item.description && (
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--overlay-paper-90)]">
              {item.description}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={beginDismiss}
        aria-label="Dismiss notification"
        className="absolute top-3 right-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[var(--overlay-paper-90)] transition-colors duration-150 hover:bg-[var(--overlay-paper-10)] hover:text-[var(--color-pure-white)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-pure-white)]"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);


  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const tone = options.tone ?? "info";
    const item: ToastItem = {
      id: nextToastId(),
      title: options.title,
      description: options.description,
      tone,
      duration: options.duration ?? (tone === "error" ? 7000 : 4800),
    };
    setItems((current) => [...current, item].slice(-4));
    return item.id;
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Toast notifications"
        className="pointer-events-none fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[min(24rem,calc(100vw-3rem))] sm:items-end"
      >
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return context;
}
