import { redirect } from "next/navigation";

import { DeliveryProjectRecordView } from "@/components/delivery/DeliveryProjectRecordView";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getDeliveryProjectForCustomer } from "@dg/platform-core";

export default async function CustomerImplementationPage() {
  const { session } = await getPlatformPageContext();
  if (!session?.organisationId) redirect("/login");

  let project = null;
  try {
    project = await getDeliveryProjectForCustomer(session.organisationId);
  } catch {
    /* not migrated */
  }

  if (!project) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-white">Your DigitalGate Implementation</h1>
        <p className="text-sm text-slate-400">
          Your implementation project will appear here once you have been accepted into DigitalGate and
          onboarding begins.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DeliveryProjectRecordView project={project} scope="customer" />
    </div>
  );
}
