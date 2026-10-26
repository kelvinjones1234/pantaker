import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function PrivacySettingsLoading() {
  return (
    <SettingsPageSkeleton
      label="Loading privacy settings"
      cards={4}
      rows={2}
      note
    />
  );
}
