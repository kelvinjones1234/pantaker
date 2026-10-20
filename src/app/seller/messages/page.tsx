import type { Metadata } from "next";
import { ChatIcon } from "@/components/brand/icons";
import { requireSeller } from "@/features/auth/authorization";
import { getInbox } from "@/features/messaging/queries";
import { ConversationList } from "@/components/messaging/ConversationList";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";

export const metadata: Metadata = {
  title: "Messages — Pantaker",
  description: "Buyer conversations across your listings.",
};

export default async function SellerInboxPage() {
  await requireSeller("/seller/messages");
  const inbox = await getInbox("seller");

  return (
    <div className="flex flex-col gap-6">
      <SellerPageHeader
        title="Messages"
        description="Buyers who've contacted you, grouped by the listing they asked about. Unread messages are counted per conversation."
      />

      {inbox.length === 0 ? (
        <SellerEmptyState
          icon={<ChatIcon className="h-6 w-6 text-[var(--color-shop-violet)]" />}
          heading="No messages yet"
          copy="When a buyer messages you about a listing, the conversation will appear here."
        />
      ) : (
        <ConversationList items={inbox} basePath="/seller/messages" />
      )}
    </div>
  );
}
