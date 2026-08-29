import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function AppsBetaProgrammesPage() {
  return (
    <PlatformHubPage
      title="Beta Programmes"
      description="Enrol this organisation in closed beta capabilities before general availability — Infrastructure Domains, Industry modules, and Growth experiments."
      links={[
        {
          href: "/dashboard/apps",
          label: "Installed Apps",
          detail: "Enable apps and manage what is live for this organisation.",
        },
        {
          href: "/dashboard/settings/connectors",
          label: "Connectors",
          detail: "Connector betas often gate alongside app enrolment.",
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
