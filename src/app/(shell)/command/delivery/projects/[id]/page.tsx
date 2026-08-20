import { notFound, redirect } from "next/navigation";

import { DeliveryProjectRecordView } from "@/components/delivery/DeliveryProjectRecordView";
import { DeliveryWorkspaceNav } from "@/components/delivery/DeliveryWorkspaceNav";
import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getDeliveryProject } from "@dg/platform-core";

export default async function StaffDeliveryProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");
  const { id } = await params;

  let project = null;
  try {
    project = await getDeliveryProject(id);
  } catch {
    /* not migrated */
  }
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <DeliveryWorkspaceNav active="projects" scope="staff" />
      <DeliveryProjectRecordView project={project} scope="staff" />
    </div>
  );
}
