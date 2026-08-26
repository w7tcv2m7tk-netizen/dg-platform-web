import { notFound, redirect } from "next/navigation";

import {
  canAccessDeliveryPartnerWorkspace,
  getDeliveryProject,
  getPartnerByClerkUserId,
  isDeliveryManager,
} from "@dg/platform-core";

import { DeliveryProjectRecordView } from "@/components/delivery/DeliveryProjectRecordView";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function PartnerDeliveryProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner || !canAccessDeliveryPartnerWorkspace(partner)) redirect("/partner/dashboard");

  const { id } = await params;
  let project = null;
  try {
    project = await getDeliveryProject(id);
  } catch {
    /* not migrated */
  }
  if (!project) notFound();

  const managerView = isDeliveryManager(partner);
  const assigned =
    managerView ||
    project.ownerPartnerId === partner.id ||
    project.deliveryLeadPartnerId === partner.id ||
    project.tasks.some((t) => t.assigneePartnerId === partner.id);

  if (!assigned) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <DeliveryProjectRecordView project={project} scope="partner" />
    </div>
  );
}
