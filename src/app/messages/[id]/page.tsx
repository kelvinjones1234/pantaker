import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAuthUser } from "@/features/auth/queries";
import { isAuthConfigured, requireUser } from "@/features/auth/authorization";
import { getConversation } from "@/features/messaging/queries";
import { ConversationPanel } from "@/components/messaging/ConversationPanel";

export const metadata: Metadata = {
  title: "Conversation — Pantaker",
};

export default async function BuyerConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser("/messages");

  // getConversation is scoped to the session and RLS restricts rows to the two
  // parties, so another user's id resolves to null and 404s.
  const [detail, user] = await Promise.all([
    getConversation(id),
    getAuthUser(),
  ]);
  if (!detail || !user) notFound();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <ConversationPanel
        detail={detail}
        currentUserId={user.id}
        basePath="/messages"
        backLabel="All messages"
        isLive={isAuthConfigured()}
      />
    </div>
  );
}
