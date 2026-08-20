import { redirect } from "next/navigation";

import { CustomerOnboardingWorkflow } from "@/components/command/PartnerEcosystemContent";
import { DeliveryWorkspaceNav } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function StaffDeliveryOnboardingPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Onboarding</h1>
        <p className="mt-1 text-sm text-slate-400">Standard 15-stage implementation SOP — every customer follows this framework.</p>
      </header>
      <DeliveryWorkspaceNav active="onboarding" scope="staff" />
      <CustomerOnboardingWorkflow />
    </div>
  );
}
