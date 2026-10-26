import { AdminTableSkeleton } from "@/components/ui/page-skeletons";

export default function AdminDeletionRequestsLoading() {
  return (
    <AdminTableSkeleton
      label="Loading deletion requests"
      rows={8}
      columns={2}
      filters={false}
      stats={0}
      pagination={false}
    />
  );
}
