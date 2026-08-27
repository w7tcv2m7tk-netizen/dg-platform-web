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

      description="DigitalGate Implementation Lifecycle™ — 16 stages. Every customer follows this framework."

      navActive="onboarding"

    >

      <CustomerOnboardingWorkflow />

    </DeliveryCommandPage>

  );

}

