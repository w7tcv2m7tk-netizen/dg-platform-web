import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function SettingsSecurityPage() {
  return (
    <PlatformHubPage
      title="Security"
      description="Organisation security controls — SSO, session policy, and access hardening ship here. Billing fraud controls and API key rotation live alongside Connectors and API."
      links={[
        {
          href: "/dashboard/settings/api",
          label: "API keys",
          detail: "Manage integration credentials and scopes.",
        },
        {
          href: "/dashboard/settings/team",
          label: "Users & Permissions",
          detail: "Roles and membership access for this organisation.",
        },
      ]}
    />
  );
}
