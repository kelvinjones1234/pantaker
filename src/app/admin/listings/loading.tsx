import { AdminTableSkeleton } from "@/components/ui/page-skeletons";

export default function AdminListingsLoading() {
  return (
    <AdminTableSkeleton
      label="Loading listings"
      rows={20}
      columns={4}
      filters
      stats={4}
    />
  );
}
