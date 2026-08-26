import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function NetworkPartnersPage() {
  return (
    <PlatformHubPage
      title="Partners"
      description="Referral partners, implementation partners, and technology alliances in the DigitalGate ecosystem — distinct from DigitalGate staff Partner operations."
      links={[
        {
          href: "/dashboard/network/refer-earn",
          label: "Refer & Earn",
          detail: "Refer DigitalGate subscriptions and earn platform credit or cash.",
        },
        {
          href: "/dashboard/marketplace/partner-services",
          label: "Partner services",
          detail: "Discover partner-delivered services in Marketplace.",
        },
      ]}
    />
  );
}
