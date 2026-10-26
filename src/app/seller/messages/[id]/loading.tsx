import { ConversationSkeleton } from "@/components/ui/page-skeletons";

export default function SellerConversationLoading() {
  return (
    <ConversationSkeleton
      label="Loading conversation"
      contained={false}
    />
  );
}
