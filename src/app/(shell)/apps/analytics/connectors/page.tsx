import Link from "next/link";

import { AnalyticsDataSourcesList } from "@/components/analytics/AnalyticsDataSourcesList";
import { AnalyticsPageIntro } from "@/components/analytics/AnalyticsPageIntro";
import { AnalyticsSubnav } from "@/components/analytics/AnalyticsSubnav";
import { loadAnalyticsPageData } from "@/lib/analytics-page-data";

export default async function AnalyticsConnectorsPage() {
  const data = await loadAnalyticsPageData();
  const { bundle } = data;

  return (
    <>
      <header className="dg-page-header">
        <AnalyticsPageIntro organisationName={bundle.organisationName} active="/apps/analytics/connectors" />
        <AnalyticsSubnav active="/apps/analytics/connectors" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Your data sources</h2>
          <p className="mt-1 text-sm text-slate-400">
            Analytics and Intelligence only show metrics from connected systems. Unconnected sources
            explain what unlocks — never fake campaign or traffic data.
          </p>
          <div className="mt-4">
            <AnalyticsDataSourcesList
              sources={bundle.dataSources}
              connectedCount={bundle.connectedSourceCount}
            />
          </div>
          <p className="mt-4 text-sm">
            <Link href="/dashboard/settings/connectors" className="text-sky-400 hover:underline">
              Manage connectors →
            </Link>
          </p>
        </section>

        <section className="dg-card border-slate-700/80">
          <h2 className="font-semibold text-white">Digital Twin completeness</h2>
          <p className="mt-1 text-sm text-slate-400">
            Each connected source deepens your Digital Twin, Business Health, Benchmarks and Advisor
            recommendations.
          </p>
          <Link href="/dashboard/twin" className="mt-3 inline-block text-sm text-sky-400 hover:underline">
            View Digital Twin →
          </Link>
        </section>
      </main>
    </>
  );
}
