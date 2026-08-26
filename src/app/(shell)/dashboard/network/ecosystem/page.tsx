import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function NetworkEcosystemPage() {
  return (
    <PlatformHubPage
      title="Ecosystem"
      description="The DigitalGate network layer — resellers, referral partners, implementation partners, integrations, and service providers connected to your business."
      links={[
        { href: "/dashboard/network/partners", label: "Partners" },
        { href: "/dashboard/network/resellers", label: "Resellers" },
        { href: "/dashboard/network/referrals", label: "Business referrals" },
        { href: "/dashboard/network/refer-earn", label: "Refer & Earn" },
        { href: "/dashboard/marketplace", label: "Marketplace" },
      ]}
    />
  );
}
