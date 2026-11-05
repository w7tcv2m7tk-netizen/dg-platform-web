import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function AppsBetaProgrammesPage() {
  return (
    <PlatformHubPage
      title="Application availability"
      description="Review organisation-specific application availability and staged capabilities. Contact DigitalGate for activation."
      links={[
        {
          href: "/dashboard/apps",
          label: "Installed Apps",
          detail: "Enable apps and manage what is live for this organisation.",
        },
        {
          href: "/dashboard/settings/connectors",
          label: "Connectors",
          detail: "Connector availability also depends on application activation.",
        },
        {
          href: "/dashboard/marketplace",
          label: "Marketplace",
          detail: "Discover capabilities not yet installed.",
        },
      ]}
    />
  );
}
