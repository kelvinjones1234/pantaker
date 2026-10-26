import { InboxSkeleton } from "@/components/ui/page-skeletons";

export default function SellerMessagesLoading() {
  return (
    <InboxSkeleton
      label="Loading buyer messages"
      contained={false}
      back={false}
    />
  );
}
