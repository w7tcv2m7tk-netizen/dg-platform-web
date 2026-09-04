import { getOperatorPartnerReferralsWorkspace } from "@dg/platform-core";

import { PartnerReferralsDashboard } from "@/components/partners/PartnerReferralsDashboard";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const operator = await requirePlatformOperatorContext();
  const data = await getOperatorPartnerReferralsWorkspace(operator);
  return <PartnerReferralsDashboard data={data} />;
}
