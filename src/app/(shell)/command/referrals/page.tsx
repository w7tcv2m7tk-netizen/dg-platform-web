import { buildReferralsWorkspace } from "@dg/platform-core";

import { PartnerReferralsDashboard } from "@/components/partners/PartnerReferralsDashboard";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const data = await buildReferralsWorkspace();
  return <PartnerReferralsDashboard data={data} />;
}
