import { getOperatorCommissionsWorkspace } from "@dg/platform-core";

import { PartnerCommissionsDashboard } from "@/components/partners/PartnerCommissionsDashboard";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  const operator = await requirePlatformOperatorContext();
  const data = await getOperatorCommissionsWorkspace(operator);
  return <PartnerCommissionsDashboard data={data} />;
}
