"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { MoreIcon } from "@/components/brand/icons";
import { cn } from "@/lib/utils";
import { nextMenuIndex, type MenuMove } from "@/components/admin/menu-nav";

export interface AdminActionMenuItem {
  key: string;
  label: string;
  /** Renders a link. Mutually optional with `onSelect`. */
  href?: string;
  /** Runs in place (e.g. opening a confirmation dialog). */
  onSelect?: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

/**
 * Accessible overflow menu. Keyboard: Enter/Space/ArrowDown open it, Arrow
 * Up/Down/Home/End move a roving focus, Escape closes and returns focus to the
 * trigger, Tab closes and lets focus continue naturally. Disabled items are
 * skipped by the roving focus and marked `aria-disabled`.
 */
export function AdminActionMenu({
  items,
  label = "Actions",
  align = "end",
}: {
  items: AdminActionMenuItem[];
  label?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerId = useId();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  const enabledIndexes = items
    .map((item, index) => (item.disabled ? -1 : index))
    .filter((index) => index >= 0);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    setActiveIndex(-1);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (open && activeIndex >= 0) itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const move = (direction: MenuMove) => {
    const position = enabledIndexes.indexOf(activeIndex);
    const nextPosition = nextMenuIndex(position, enabledIndexes.length, direction);
    setActiveIndex(nextPosition < 0 ? -1 : enabledIndexes[nextPosition]);
  };

  const openAt = (position: -1 | 0 | "last") => {
    if (enabledIndexes.length === 0) {
      setOpen(true);
      setActiveIndex(-1);
      return;
    }
    setOpen(true);
    setActiveIndex(
      position === "last" ? enabledIndexes[enabledIndexes.length - 1] : enabledIndexes[0],
    );
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openAt("last");
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        move(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        move("first");
        break;
      case "End":
        event.preventDefault();
        move("last");
        break;
      case "Escape":
        event.preventDefault();
        close(true);
        break;
      case "Tab":
        close();
        break;
      default:
        break;
    }
  };

  const itemClass = (item: AdminActionMenuItem) =>
    cn(
      "flex w-full items-center gap-2 rounded-[14px] px-3 py-2 text-left text-[13px] font-medium outline-none transition-colors duration-150",
      item.disabled
        ? "cursor-not-allowed text-[var(--color-cool-stone)]"
        : item.tone === "danger"
          ? "cursor-pointer text-[var(--color-error)] hover:bg-[var(--color-error-bg)] focus-visible:bg-[var(--color-error-bg)]"
          : "cursor-pointer text-[var(--color-ink-black)] hover:bg-[var(--color-canvas-mist)] focus-visible:bg-[var(--color-canvas-mist)]",
    );

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => (open ? close() : openAt(0))}
        onKeyDown={onTriggerKeyDown}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] text-[var(--color-ink-black)] transition-colors duration-150 hover:border-[var(--color-ink-30)]"
      >
        <MoreIcon className="h-5 w-5" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute top-full z-40 mt-2 min-w-[200px] rounded-[20px] border border-[var(--color-faint-border)] bg-[var(--color-pure-white)] p-1.5",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, index) => {
            const ref = (element: HTMLElement | null) => {
              itemRefs.current[index] = element;
            };
            if (item.disabled) {
              return (
                <span
                  key={item.key}
                  role="menuitem"
                  aria-disabled="true"
                  className={itemClass(item)}
                >
                  {item.label}
                </span>
              );
            }
            if (item.href) {
              return (
                <Link
                  key={item.key}
                  ref={ref}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  onClick={() => close()}
                  className={itemClass(item)}
                >
                  {item.label}
                </Link>
              );
            }
            return (
              <button
                key={item.key}
                ref={ref}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={() => {
                  item.onSelect?.();
                  close();
                }}
                className={itemClass(item)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
