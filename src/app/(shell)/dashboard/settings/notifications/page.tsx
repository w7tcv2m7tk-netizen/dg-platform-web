import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function SettingsNotificationsPage() {
  return (
    <PlatformHubPage
      title="Notifications"
      description="Control how DigitalGate notifies your team — billing, intelligence alerts, connector health, and workflow events."
      links={[
        {
          href: "/dashboard/settings",
          label: "Settings overview",
          detail: "Return to organisation configuration home.",
        },
      ]}
    />
  );
}
