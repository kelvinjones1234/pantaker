import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function HelpSettingsLoading() {
  return (
    <SettingsPageSkeleton
      label="Loading help and support"
      cards={3}
      rows={2}
    />
  );
}
