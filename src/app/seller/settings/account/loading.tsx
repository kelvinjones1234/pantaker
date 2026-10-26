import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function AccountSettingsLoading() {
  return (
    <SettingsPageSkeleton
      label="Loading account settings"
      cards={3}
      rows={1}
    />
  );
}
