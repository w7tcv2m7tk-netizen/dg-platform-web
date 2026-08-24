import { notFound, redirect } from "next/navigation";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { DeliveryProjectRecordView } from "@/components/delivery/DeliveryProjectRecordView";
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
    <DeliveryCommandPage
      title={project.customerName}
      description={`Implementation #${project.referenceCode}`}
      navActive="projects"
      backHref="/command/delivery/projects"
      backLabel="Active projects"
    >
      <DeliveryProjectRecordView project={project} scope="staff" hideChrome />
    </DeliveryCommandPage>
  );
}
