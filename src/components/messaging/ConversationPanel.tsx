import Link from "next/link";
import { MessageThread } from "@/components/messaging/MessageThread";
import { ConversationActions } from "@/components/messaging/ConversationActions";
import { ListingContextCard } from "@/components/messaging/ListingContextCard";
import { ParticipantAvatar } from "@/components/messaging/ParticipantAvatar";
import { SellerStatusPill } from "@/components/seller/SellerStatusPill";
import type { ConversationDetail } from "@/features/messaging/queries";

function participantName(detail: ConversationDetail): string {
  const other = detail.other;
  if (!other) return "Pantaker user";
  return (
    other.display_name ??
    (other.username ? `@${other.username}` : "Pantaker user")
  );
}

/**
 * Shared conversation view used by both the buyer (`/messages`) and seller
 * (`/seller/messages`) inboxes. The server has already resolved the session
 * user's role and participation; this only renders.
 */
export function ConversationPanel({
  detail,
  currentUserId,
  basePath,
  backLabel,
  isLive,
}: {
  detail: ConversationDetail;
  currentUserId: string;
  basePath: string;
  backLabel: string;
  isLive: boolean;
}) {
  const otherName = participantName(detail);
  const otherRoleLabel = detail.role === "seller" ? "Buyer" : "Seller";

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={basePath}
        className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
      >
        ← {backLabel}
      </Link>

      <div className="shop-card flex items-center gap-3 p-4">
        <ParticipantAvatar
          name={otherName}
          avatarPath={detail.other?.avatar_path}
          className="h-11 w-11"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--color-ink-black)]">
            {otherName}
          </p>
          <p className="truncate text-[12px] text-[var(--color-muted-gray)]">
            {otherRoleLabel} ·{" "}
            {detail.listing?.title ?? "Listing no longer available"}
          </p>
        </div>
        {detail.listing && (
          <SellerStatusPill status={detail.listing.item_status} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="shop-card flex max-h-[70vh] min-h-[55vh] flex-col p-4 sm:p-5">
          <MessageThread
            conversationId={detail.conversation.id}
            currentUserId={currentUserId}
            initialMessages={detail.messages}
            canSend={detail.canSend}
            blockReason={detail.blockReason}
            otherName={otherName}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="shop-card p-5">
            <ListingContextCard listing={detail.listing} />
          </div>
          <div className="shop-card p-5">
            <p className="text-[13px] font-semibold text-[var(--color-ink-black)]">
              Safety
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-muted-gray)]">
              Keep the deal on Pantaker. Never send money before you&apos;ve
              seen the item.
            </p>
            <div className="mt-4">
              <ConversationActions
                conversationId={detail.conversation.id}
                otherName={otherName}
                blockedByMe={detail.blockedByMe}
                isLive={isLive}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
