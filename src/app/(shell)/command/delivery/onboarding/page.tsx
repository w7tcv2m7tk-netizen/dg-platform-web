import { redirect } from "next/navigation";

import { CustomerOnboardingWorkflow } from "@/components/command/PartnerEcosystemContent";
import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function StaffDeliveryOnboardingPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  return (
    <DeliveryCommandPage
      title="Onboarding"
      description="Standard 16-stage implementation framework — every customer follows this lifecycle."
      navActive="onboarding"
    >
      <CustomerOnboardingWorkflow />
    </DeliveryCommandPage>
  );
}
