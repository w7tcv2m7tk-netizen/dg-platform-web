import { redirect } from "next/navigation";

import { CustomerOnboardingWorkflow } from "@/components/command/PartnerEcosystemContent";
import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { getPlatformPageContext } from "@/lib/platform-page-context";

/**
 * Delivery → Onboarding — customer kick-off / acceptance workflow.
 * Implementation Lifecycle stages still live under Implementation Plans.
 */
export default async function StaffDeliveryOnboardingPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  return (
    <DeliveryCommandPage
      title="Onboarding"
      description="Customer kick-off and acceptance — early onboarding work before and alongside the Implementation Lifecycle."
      navActive="onboarding"
    >
      <CustomerOnboardingWorkflow />
    </DeliveryCommandPage>
  );
}
