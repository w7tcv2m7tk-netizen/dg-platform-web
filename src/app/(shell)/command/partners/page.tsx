import { buildPartnerDashboardWorkspace } from "@dg/platform-core";

import { PartnerProgrammeDashboard } from "@/components/partners/PartnerProgrammeDashboard";

export const dynamic = "force-dynamic";

export default async function PartnerProgrammeDashboardPage() {
  const data = await buildPartnerDashboardWorkspace();
  return <PartnerProgrammeDashboard data={data} />;
}
