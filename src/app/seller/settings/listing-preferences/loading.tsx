import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function ListingPreferencesLoading() {
  return (
    <SettingsPageSkeleton
      label="Loading listing preferences"
      cards={1}
      rows={0}
      note
    />
  );
}
