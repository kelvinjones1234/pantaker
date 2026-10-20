import Link from "next/link";
import { ParticipantAvatar } from "@/components/messaging/ParticipantAvatar";
import { timeAgo } from "@/lib/utils";
import type { ConversationSummary } from "@/types/marketplace";

function participantName(summary: ConversationSummary): string {
  const other = summary.other;
  if (!other) return "Pantaker user";
  return other.display_name ?? (other.username ? `@${other.username}` : "Pantaker user");
}

/** Inbox list of conversations, newest activity first. */
export function ConversationList({
  items,
  basePath,
}: {
  items: ConversationSummary[];
  basePath: string;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        const unread = item.unreadCount > 0;
        return (
          <li key={item.id}>
            <Link
              href={`${basePath}/${item.id}`}
              className="shop-card flex items-start gap-3 p-4 transition-colors duration-150 hover:border-[var(--color-ink-30)]"
            >
              <ParticipantAvatar
                name={participantName(item)}
                avatarPath={item.other?.avatar_path}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-[13px] font-semibold text-[var(--color-ink-black)]">
                    {participantName(item)}
                  </p>
                  <span className="shrink-0 text-[11px] text-[var(--color-muted-gray)]">
                    {timeAgo(item.updatedAt)}
                  </span>
                </div>
                {item.listing && (
                  <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-gray)]">
                    {item.listing.title}
                  </p>
                )}
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p
                    className={
                      unread
                        ? "truncate text-[12px] font-medium text-[var(--color-ink-black)]"
                        : "truncate text-[12px] text-[var(--color-muted-gray)]"
                    }
                  >
                    {item.lastMessage?.body ?? "No messages yet"}
                  </p>
                  {unread && (
                    <span
                      className="shrink-0 rounded-full bg-[var(--color-shop-violet)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-pure-white)]"
                      aria-label={`${item.unreadCount} unread messages`}
                    >
                      {item.unreadCount}
                    </span>
                  )}
                  {!unread && item.blockedMe && (
                    <span className="shrink-0 text-[11px] text-[var(--color-muted-gray)]">Blocked you</span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
