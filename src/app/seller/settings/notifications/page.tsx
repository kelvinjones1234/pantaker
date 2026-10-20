import type { Metadata } from "next";
import { requireSeller } from "@/features/auth/authorization";
import { getNotificationPreferences } from "@/features/notifications/queries";
import { SellerPageHeader } from "@/components/seller/SellerPageHeader";
import { SettingsCard, SettingsRow } from "@/components/seller/SettingsCard";
import { NotificationPreferencesForm } from "@/components/notifications/NotificationPreferencesForm";

export const metadata: Metadata = {
  title: "Notification settings — Pantaker",
  description: "What Pantaker notifies you about, and where those notifications appear.",
};

export default async function NotificationsSettingsPage() {
  await requireSeller("/seller/settings/notifications");
  const preferences = await getNotificationPreferences();

  return (
    <div className="flex flex-col gap-5">
      <SellerPageHeader
        title="Notifications"
        description="Pantaker only shows controls for channels and events it actually delivers. Today that's in-app notifications, shown under the bell in your Seller Centre."
      />

      <SettingsCard
        title="In-app notifications"
        description="Switch off a category and its notices stop appearing in your notification list. Everything else keeps working."
      >
        <NotificationPreferencesForm preferences={preferences} />
      </SettingsCard>

      <SettingsCard
        title="Where we reach you"
        description="Only channels Pantaker can deliver are available. The rest are shown so nothing is hidden — with no toggle for a channel that doesn't exist yet."
      >
        <div>
          <SettingsRow
            label="In-app"
            note="Shown in your notification list and counted on the bell."
            value="Available"
          />
          <SettingsRow
            label="Email"
            note="Not built yet — no email is sent about your listings or enquiries."
            value="Not available"
          />
          <SettingsRow
            label="Push notifications"
            note="Pantaker has no mobile app or push service."
            value="Not available"
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Always on" description="Security-relevant events you can't switch off.">
        <div>
          <SettingsRow
            label="Account and security"
            note="For example, confirming a new email address after you request a change."
            value="On"
          />
        </div>
      </SettingsCard>

      <p className="px-1 text-[12px] leading-relaxed text-[var(--color-ash-veil)]">
        Because there are no email or push channels yet, there's nothing to switch off there. When
        those channels ship, their preferences will appear here.
      </p>
    </div>
  );
}
