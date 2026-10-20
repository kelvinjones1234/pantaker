import { SkeletonTable } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return <SkeletonTable rows={6} columns={4} label="Loading admin data" />;
}
