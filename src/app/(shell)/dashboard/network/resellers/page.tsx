import { redirectUnlessStaffNetwork, PlatformHubPage } from "@/lib/network-staff-gate";

export default async function NetworkResellersPage() {
  await redirectUnlessStaffNetwork();

  return (
    <PlatformHubPage
      title="Acquisition Partners"
      description="Founding Acquisition Partners and the Acquisition Partner programme — commercial administration for DigitalGate staff."
      links={[
        {
          href: "/command/partners/acquisition",
          label: "Acquisition Partner roster",
          detail: "Operate partner onboarding and status.",
        },
        {
          href: "/command/commissions",
          label: "Commissions",
          detail: "Approve and pay Acquisition Partner commissions.",
        },
      ]}
    />
  );
}
