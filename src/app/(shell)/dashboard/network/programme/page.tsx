import { redirectUnlessStaffNetwork, PlatformHubPage } from "@/lib/network-staff-gate";

export default async function NetworkProgrammeSettingsPage() {
  await redirectUnlessStaffNetwork("/dashboard/network/refer-earn");

  return (
    <PlatformHubPage
      title="Programme Settings"
      description="Configure DigitalGate network programmes — Refer & Earn tiers, partner commission rules, and enrolment policies."
      links={[
        {
          href: "/dashboard/network/refer-earn",
          label: "Refer & Earn",
          detail: "Org-level Refer & Earn dashboard and Connect payouts.",
        },
        {
          href: "/command/partners",
          label: "Partners programme",
          detail: "Reseller and partner programme operations.",
        },
      ]}
    />
  );
}
