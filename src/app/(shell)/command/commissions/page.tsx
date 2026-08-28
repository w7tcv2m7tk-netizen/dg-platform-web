import { buildCommissionsWorkspace } from "@dg/platform-core";

import { PartnerCommissionsDashboard } from "@/components/partners/PartnerCommissionsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminCommissionsPage() {
  const data = await buildCommissionsWorkspace();
  return <PartnerCommissionsDashboard data={data} />;
}
