import { AdminTableSkeleton } from "@/components/ui/page-skeletons";

export default function AdminAdminsLoading() {
  return (
    <AdminTableSkeleton
      label="Loading administrators"
      rows={8}
      columns={3}
      filters={false}
      stats={0}
      pagination={false}
    />
  );
}
