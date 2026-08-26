import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function NetworkResellersPage() {
  return (
    <PlatformHubPage
      title="Resellers"
      description="Founding resellers and authorised DigitalGate sellers — programme management lives with DigitalGate staff; this is your organisation’s reseller relationship surface."
      links={[
        {
          href: "/dashboard/network/refer-earn",
          label: "Refer & Earn (Reseller tier)",
          detail: "Reseller programme earns 30% platform credit when configured for your org.",
        },
      ]}
    />
  );
}
