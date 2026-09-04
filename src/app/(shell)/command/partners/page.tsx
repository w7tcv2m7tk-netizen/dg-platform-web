import { getOperatorPartnerDashboardWorkspace } from "@dg/platform-core";

import { PartnerProgrammeDashboard } from "@/components/partners/PartnerProgrammeDashboard";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";

export default async function PartnerProgrammeDashboardPage() {
  const operator = await requirePlatformOperatorContext();
  const data = await getOperatorPartnerDashboardWorkspace(operator);
  return <PartnerProgrammeDashboard data={data} />;
}
