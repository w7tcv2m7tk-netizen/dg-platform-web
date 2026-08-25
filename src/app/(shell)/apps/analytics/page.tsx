import { AnalyticsEvidenceGrid } from "@/components/analytics/AnalyticsEvidenceGrid";
import {
  AnalyticsHealthReference,
  AnalyticsPageIntro,
  AnalyticsPhilosophyNote,
} from "@/components/analytics/AnalyticsPageIntro";
import { AnalyticsKeyMetricsGrid } from "@/components/analytics/AnalyticsKeyMetricsGrid";
import { AnalyticsTrendChart } from "@/components/analytics/AnalyticsTrendChart";
import { loadAnalyticsPageData } from "@/lib/analytics-page-data";
import Link from "next/link";

export default async function AnalyticsOverviewPage() {
  const data = await loadAnalyticsPageData();
  const { bundle } = data;

  return (
    <>
      <header className="dg-page-header">
        <AnalyticsPageIntro organisationName={bundle.organisationName} active="/apps/analytics" />
      </header>
      <main className="dg-page-main space-y-6">
        <AnalyticsPhilosophyNote />

        {!data.metrics ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
            Connect CRM, commerce, and website systems to load live metrics. Analytics never invents
            numbers — only connected data appears here.
          </div>
        ) : null}

        <section className="dg-card">
          <h2 className="font-semibold text-white">Key metrics</h2>
          <p className="mt-1 text-sm text-slate-500">
            High-level KPIs with context — inspect the evidence behind Intelligence surfaces.
          </p>
          <div className="mt-4">
            <AnalyticsKeyMetricsGrid items={bundle.keyMetrics} />
          </div>
        </section>

        <AnalyticsHealthReference score={bundle.businessHealth} />

        <section className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Leads</h2>
              <p className="mt-1 text-sm text-slate-500">
                Inspect lead volume over time, then drill into source, status and opportunity value
                in CRM.
              </p>
            </div>
            <Link href="/apps/crm/leads" className="text-sm text-sky-400 hover:underline">
              Drill down →
            </Link>
          </div>
          <div className="mt-4">
            <AnalyticsTrendChart points={bundle.leadTrend} note={bundle.leadTrendNote} />
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Digital evidence</h2>
          <p className="mt-1 text-sm text-slate-500">
            Scores and counts from connected systems. Missing data shows how to connect — never fake
            metrics.
          </p>
          <div className="mt-4">
            <AnalyticsEvidenceGrid items={bundle.evidenceMetrics} />
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/apps/analytics/dashboard" className="text-sky-400 hover:underline">
                Dashboard
              </Link>{" "}
              — predefined executive, sales, marketing and operations views
            </li>
            <li>
              <Link href="/apps/analytics/reports" className="text-sky-400 hover:underline">
                Reports
              </Link>{" "}
              — formal business performance reports with AI commentary
            </li>
            <li>
              <Link href="/apps/analytics/connectors" className="text-sky-400 hover:underline">
                Data sources
              </Link>{" "}
              — connected systems feeding Analytics and your Digital Twin
            </li>
            <li>
              <Link href="/dashboard/insights" className="text-sky-400 hover:underline">
                Insights
              </Link>{" "}
              — what DigitalGate is noticing (Intelligence interpretation)
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
