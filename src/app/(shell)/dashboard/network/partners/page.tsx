import { redirectUnlessStaffNetwork, PlatformHubPage } from "@/lib/network-staff-gate";

export default async function NetworkPartnersPage() {
  await redirectUnlessStaffNetwork("/dashboard/network/connections");

  return (
    <PlatformHubPage
      title="Partners"
      description="DigitalGate partner relationships — referral partners, implementation partners, and technology alliances. Day-to-day operating lives under DigitalGate → Partners."
      links={[
        {
          href: "/command/partners",
          label: "Partners dashboard",
          detail: "Operate reseller and partner relationships.",
        },
        {
          href: "/command/partners/ecosystem",
          label: "Partner ecosystem",
          detail: "Ecosystem map and programme health.",
        },
        {
          href: "/dashboard/network/programme",
          label: "Programme Settings",
          detail: "Refer & Earn and network programme configuration.",
        },
      ]}
    />
  );
}
