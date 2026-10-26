import { FormPageSkeleton } from "@/components/ui/page-skeletons";

export default function EditListingLoading() {
  return (
    <FormPageSkeleton
      label="Loading listing editor"
      sections={5}
      fieldsPerSection={4}
    />
  );
}
