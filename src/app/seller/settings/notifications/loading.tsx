import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function NotificationSettingsLoading() {
  return (
    <SettingsPageSkeleton
      label="Loading notification settings"
      cards={3}
      rows={2}
      note
    />
  );
}
