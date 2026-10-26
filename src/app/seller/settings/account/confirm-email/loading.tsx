import { SettingsPageSkeleton } from "@/components/ui/page-skeletons";

export default function ConfirmEmailLoading() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6">
      <SettingsPageSkeleton
        label="Loading email confirmation"
        cards={1}
        rows={0}
      />
    </div>
  );
}
