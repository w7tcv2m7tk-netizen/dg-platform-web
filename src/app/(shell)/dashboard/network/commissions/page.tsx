import { PlatformHubPage } from "@/components/platform/PlatformHubPage";

export default function NetworkCommissionsPage() {
  return (
    <PlatformHubPage
      title="Commissions"
      description="Commission tracking for referral and reseller relationships — Platform Refer & Earn ledger, Connect payouts, and future partner commission models."
      links={[
        {
          href: "/dashboard/network/refer-earn",
          label: "Refer & Earn ledger",
          detail: "View referral metrics, credits, and Stripe Connect cash payouts.",
        },
      ]}
    />
  );
}
