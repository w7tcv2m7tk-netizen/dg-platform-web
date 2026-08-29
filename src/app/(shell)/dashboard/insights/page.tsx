import Link from "next/link";

import { InsightsDashboard } from "@/components/intelligence/InsightsDashboard";
import { loadInsightsPageData } from "@/lib/insights-page-data";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export default async function InsightsPage() {
  await ensureOrganisationOnboardingSync();
  const data = await loadInsightsPageData();

  if (!data) {
    return (
      <>
        <header className="dg-page-header">
          <p className="text-xs font-medium uppercase tracking-widest text-violet-400/90">
            Business · Insights
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Insights</h1>
        </header>
        <main className="dg-page-main">
          <p className="text-sm text-slate-400">Sign in to view what DigitalGate is noticing.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-violet-400/90">
          Business · Insights
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Insights</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          What is DigitalGate noticing? Interpreted signals from your connected business — not raw
          metrics. For the underlying numbers, use Analytics.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href="/apps/analytics" className="text-sky-400 hover:underline">
            Analytics →
          </Link>
          <Link href="/dashboard/advisor" className="text-sky-400 hover:underline">
            AI Advisor →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        <InsightsDashboard
          organisationName={data.organisationName}
          intelligence={data.intelligence}
        />
      </main>
    </>
  );
}
