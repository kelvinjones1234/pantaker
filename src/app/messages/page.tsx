import type { Metadata } from "next";
import Link from "next/link";
import { ChatIcon } from "@/components/brand/icons";
import { requireUser } from "@/features/auth/authorization";
import { getInbox } from "@/features/messaging/queries";
import { ConversationList } from "@/components/messaging/ConversationList";
import { SellerEmptyState } from "@/components/seller/SellerEmptyState";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";

export const metadata: Metadata = {
  title: "Messages — Pantaker",
  description: "Your conversations with Pantaker sellers.",
};

export default async function BuyerInboxPage() {
  await requireUser("/messages");
  const inbox = await getInbox("buyer");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/marketplace"
        className="text-[12px] font-semibold text-[var(--color-shop-violet)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
      >
        ← Back to marketplace
      </Link>

      <SellerPageHeader
        title="Messages"
        description="Conversations you've started about listings. Everything stays tied to the listing it's about."
      />

      {inbox.length === 0 ? (
        <SellerEmptyState
          icon={<ChatIcon className="h-6 w-6 text-[var(--color-shop-violet)]" />}
          heading="No conversations yet"
          copy="Message a seller from any listing and the conversation will appear here, with its message history kept on Pantaker — not in your browser."
        />
      ) : (
        <ConversationList items={inbox} basePath="/messages" />
      )}
    </div>
  );
}
