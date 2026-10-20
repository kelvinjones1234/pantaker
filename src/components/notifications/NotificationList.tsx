"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  ChatIcon,
  CheckIcon,
  KeyIcon,
  ReceiptIcon,
  TagIcon,
  type BrandIconComponent,
} from "@/components/brand/icons";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { NOTIFICATION_META, splitByRead } from "@/features/notifications/rules";
import { cn, timeAgo } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/types/marketplace";

const TYPE_ICON: Record<NotificationType, BrandIconComponent> = {
  listing_published: TagIcon,
  listing_rejected: TagIcon,
  new_message: ChatIcon,
  sale_status_changed: ReceiptIcon,
  account_email_change: KeyIcon,
};

function NotificationRow({
  notification,
  unread,
  onOpen,
}: {
  notification: AppNotification;
  unread: boolean;
  onOpen: () => void;
}) {
  const Icon = TYPE_ICON[notification.type] ?? TagIcon;
  const meta = NOTIFICATION_META[notification.type];

  return (
    <Link
      href={notification.href}
      onClick={onOpen}
      className={cn(
        "flex items-start gap-3 rounded-[20px] p-3.5 transition-colors duration-150",
        unread
          ? "bg-[var(--color-canvas-mist)] hover:bg-[var(--color-primary-tint)]"
          : "hover:bg-[var(--color-canvas-mist)]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
          unread
            ? "bg-[var(--color-pure-white)] text-[var(--color-shop-violet)]"
            : "bg-[var(--color-canvas-mist)] text-[var(--color-muted-gray)]",
        )}
        aria-hidden="true"
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-[13px]",
              unread
                ? "font-semibold text-[var(--color-ink-black)]"
                : "font-medium text-[var(--color-ash-veil)]",
            )}
          >
            {notification.title}
          </span>
          {unread && (
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-shop-violet)]"
              aria-label="Unread"
            />
          )}
        </span>
        {notification.body && (
          <span className="mt-0.5 block text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
            {notification.body}
          </span>
        )}
        <span className="mt-1 block text-[11px] text-[var(--color-muted-gray)]">
          {meta?.label ?? "Notification"} · {timeAgo(notification.created_at)}
        </span>
      </span>
    </Link>
  );
}

/**
 * The notification list. Opening an unread row marks it read (fire-and-forget —
 * navigation is never blocked by the bookkeeping), and "Mark all as read" clears
 * the rest. The server owns the data; the list only reflects it.
 */
export function NotificationList({ items }: { items: AppNotification[] }) {
  const [isPending, startTransition] = useTransition();
  const { unread, read } = splitByRead(items);

  const markRead = (id: string) => {
    startTransition(() => {
      void markNotificationReadAction(id);
    });
  };

  const markAll = () => {
    startTransition(() => {
      void markAllNotificationsReadAction();
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--color-ash-veil)]">
          {unread.length > 0 ? `${unread.length} unread` : "You're all caught up"}
        </p>
        {unread.length > 0 && (
          <button
            type="button"
            onClick={markAll}
            disabled={isPending}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[var(--color-canvas-mist)] px-3.5 py-2 text-[12px] font-semibold text-[var(--color-ink-black)] transition-colors duration-150 hover:bg-[var(--color-primary-tint)] disabled:cursor-wait disabled:opacity-60"
          >
            <CheckIcon className="h-3.5 w-3.5" />
            Mark all as read
          </button>
        )}
      </div>

      {unread.length > 0 && (
        <section className="flex flex-col gap-1" aria-label="Unread notifications">
          {unread.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              unread
              onOpen={() => markRead(notification.id)}
            />
          ))}
        </section>
      )}

      {read.length > 0 && (
        <section className="flex flex-col gap-1" aria-label="Earlier notifications">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-gray)]">
            Earlier
          </h2>
          {read.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              unread={false}
              onOpen={() => {}}
            />
          ))}
        </section>
      )}
    </div>
  );
}
