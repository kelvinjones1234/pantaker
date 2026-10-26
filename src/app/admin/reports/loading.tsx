import { AdminTableSkeleton } from "@/components/ui/page-skeletons";

export default function AdminReportsLoading() {
  return (
    <AdminTableSkeleton
      label="Loading reports"
      rows={20}
      columns={4}
      filters
      stats={4}
    />
  );
}
