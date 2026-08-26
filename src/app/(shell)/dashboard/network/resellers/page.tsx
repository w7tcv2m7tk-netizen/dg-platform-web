import { redirectUnlessStaffNetwork, PlatformHubPage } from "@/lib/network-staff-gate";

export default async function NetworkResellersPage() {
  await redirectUnlessStaffNetwork();

  return (
    <PlatformHubPage
      title="Resellers"
      description="Authorised DigitalGate sellers and founding resellers — commercial programme administration for DigitalGate staff."
      links={[
        {
          href: "/command/partners/resellers",
          label: "Reseller roster",
          detail: "Operate reseller onboarding and status.",
        },
        {
          href: "/command/commissions",
          label: "Commissions",
          detail: "Approve and pay reseller commissions.",
        },
      ]}
    />
  );
}
