import { redirectUnlessStaffNetwork, PlatformHubPage } from "@/lib/network-staff-gate";

export default async function NetworkEcosystemPage() {
  await redirectUnlessStaffNetwork();

  return (
    <PlatformHubPage
      title="Ecosystem"
      description="DigitalGate’s network architecture — resellers, referral partners, implementation partners, integrations, and service providers. Staff-only; customers see Connections instead."
      links={[
        { href: "/dashboard/network/partners", label: "Partners" },
        { href: "/dashboard/network/resellers", label: "Resellers" },
        { href: "/dashboard/network/commissions", label: "Commissions" },
        { href: "/command/partners/ecosystem", label: "Partners ecosystem" },
        { href: "/dashboard/marketplace", label: "Marketplace" },
      ]}
    />
  );
}
