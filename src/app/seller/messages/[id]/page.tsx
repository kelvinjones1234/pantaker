import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/features/auth/queries";
import { isAuthConfigured, requireSeller } from "@/features/auth/authorization";
import { getConversation } from "@/features/messaging/queries";
import { ConversationPanel } from "@/components/messaging/ConversationPanel";

export const metadata: Metadata = {
  title: "Conversation — Pantaker",
};

export default async function SellerConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSeller(`/seller/messages/${id}`);

  const [detail, user] = await Promise.all([
    getConversation(id),
    getAuthUser(),
  ]);
  if (!detail || !user) notFound();

  return (
    <ConversationPanel
      detail={detail}
      currentUserId={user.id}
      basePath="/seller/messages"
      backLabel="Inbox"
      isLive={isAuthConfigured()}
    />
  );
}
