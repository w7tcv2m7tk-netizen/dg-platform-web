import Link from "next/link";
import { getAppSetupHref } from "@dg/platform-core";
import { GrowthSubPageHeader } from "@/components/growth/GrowthSubPageHeader";

import { AutomationRulesList } from "@/components/automation/AutomationRulesList";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function AutomationRulesPage() {
  const { session } = await getPlatformPageContext();

  return (
    <>
      <GrowthSubPageHeader
        title="Automation rules"
        description={<>{session?.organisationName ?? "DigitalGate"} · active automated workflows</>}
        actions={<Link href={getAppSetupHref("automation")} className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-500/15">Setup guide</Link>}
      />
      <main className="dg-page-main">
        <AutomationRulesList />
      </main>
    </>
  );
}
