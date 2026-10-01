import { getOperatorPlatformAlertsCentre } from "@dg/platform-core";

import { OperatorDataUnavailable } from "@/components/command/OperatorDataUnavailable";
import { AppPageHeader } from "@/components/ui/AppPageHeader";
import { PlatformAlertsDashboard } from "@/components/command/PlatformAlertsDashboard";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

export default async function CommandPlatformAlertsPage() {
  const operator = await requirePlatformOperatorContext();
  const data = process.env.DATABASE_URL
    ? await getOperatorPlatformAlertsCentre(operator)
    : null;

  return (
    <>
      <AppPageHeader family="Operator" title="Platform Alerts" description="Platform health and issues requiring DigitalGate staff attention — investigate exceptions before deciding with AI Advisor. Distinct from customer business alerts inside each organisation." />
      <main className="dg-page-main space-y-8">
        {!data ? (
          <OperatorDataUnavailable label="platform alert" showHealthLink={false} />
        ) : (
          <PlatformAlertsDashboard data={data} />
        )}
      </main>
    </>
  );
}
