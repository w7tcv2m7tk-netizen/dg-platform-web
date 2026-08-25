import Link from "next/link";
import { getAppSetupHref } from "@dg/platform-core";

import { AutomationRulesList } from "@/components/automation/AutomationRulesList";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function AutomationRulesPage() {
  const { session } = await getPlatformPageContext();

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Automation rules</h1>
          <Link
            href={getAppSetupHref("automation")}
            className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-500/15"
          >
            Setup guide
          </Link>
        </div>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · registered trigger → action rules
        </p>
      </header>
      <main className="dg-page-main">
        <AutomationRulesList />
      </main>
    </>
  );
}
