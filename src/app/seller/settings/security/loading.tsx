import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function SecuritySettingsLoading() {
  return (
    <SettingsPageSkeleton
      label="Loading security settings"
      cards={3}
      rows={2}
    />
  );
}
