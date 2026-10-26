import { AdminTableSkeleton } from "@/components/ui/page-skeletons";

export default function AdminAccountsLoading() {
  return (
    <AdminTableSkeleton
      label="Loading accounts"
      rows={20}
      columns={5}
      filters
      stats={4}
    />
  );
}
