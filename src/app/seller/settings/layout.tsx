import { requireSeller } from "@/features/auth/authorization";
import { SettingsSubnav } from "@/components/seller/SettingsSubnav";

/**
 * Settings area shell. Access is enforced server-side before any child renders;
 * groups are kept as separate routes (and separate cards) so the area stays
 * scannable on mobile instead of collapsing into one long form.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireSeller("/seller/settings");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <SettingsSubnav />
      {children}
    </div>
  );
}
