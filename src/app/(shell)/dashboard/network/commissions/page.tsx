import { redirectUnlessStaffNetwork, PlatformHubPage } from "@/lib/network-staff-gate";

export default async function NetworkCommissionsPage() {
  await redirectUnlessStaffNetwork("/dashboard/network/refer-earn");

  return (
    <PlatformHubPage
      title="Commissions"
      description="Commission ledger and payout administration for DigitalGate’s partner and reseller programmes. Customer earnings live inside Refer & Earn."
      links={[
        {
          href: "/command/commissions",
          label: "Commission queue",
          detail: "Pending · approved · paid.",
        },
        {
          href: "/command/partners/payouts",
          label: "Partner payouts",
          detail: "Payout runs and status.",
        },
      ]}
    />
  );
}
