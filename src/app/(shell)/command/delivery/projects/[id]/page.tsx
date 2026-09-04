import { notFound } from "next/navigation";
import { getOperatorDeliveryProject } from "@dg/platform-core";

import { DeliveryCommandPage } from "@/components/delivery/DeliveryCommandPage";
import { DeliveryProjectRecordView } from "@/components/delivery/DeliveryProjectRecordView";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function StaffDeliveryProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const operator = await requirePlatformOperatorContext();
  const { id } = await params;

  let project = null;
  try {
    project = await getOperatorDeliveryProject(operator, id);
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
      backLabel="Implementation projects"
    >
      <DeliveryProjectRecordView project={project} scope="staff" hideChrome />
    </DeliveryCommandPage>
  );
}
