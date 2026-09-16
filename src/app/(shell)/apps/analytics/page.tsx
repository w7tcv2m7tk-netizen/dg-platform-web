import Link from "next/link";

import { AnalyticsEvidenceGrid } from "@/components/analytics/AnalyticsEvidenceGrid";
import { AnalyticsHealthReference, AnalyticsPageIntro, AnalyticsPhilosophyNote } from "@/components/analytics/AnalyticsPageIntro";
import { AnalyticsKeyMetricsGrid } from "@/components/analytics/AnalyticsKeyMetricsGrid";
import { AnalyticsTrendChart } from "@/components/analytics/AnalyticsTrendChart";
import { ResolutionAction } from "@/components/ui/ResolutionAction";
import { formatAudMoney, loadAnalyticsPageData } from "@/lib/analytics-page-data";

export default async function AnalyticsOverviewPage() {
  const data = await loadAnalyticsPageData();
  const { bundle, operational, insights } = data;

  return (
    <>
      <header className="dg-page-header">
        <AnalyticsPageIntro organisationName={bundle.organisationName} active="/apps/analytics" />
      </header>
      <main className="dg-page-main space-y-6">
        <AnalyticsPhilosophyNote />

        {!data.metrics ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-5 py-4">
            <p className="font-medium text-amber-100">Analytics needs live business data</p>
            <p className="mt-1 text-sm text-slate-400">Connect CRM, commerce and website systems to load real metrics. Missing evidence stays visibly unavailable until a source is connected.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <ResolutionAction href="/apps/analytics/connectors" mode="guided" label="Connect data sources" />
              <ResolutionAction href="/dashboard/advisor" mode="guided" label="Help me choose what to connect" />
            </div>
          </section>
        ) : null}

        <section className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">What DigitalGate is noticing</h2>
              <p className="mt-1 text-sm text-slate-500">Prioritised observations generated from your live CRM, pipeline, operations and Digital Twin evidence.</p>
            </div>
            <Link href="/dashboard/advisor" className="text-sm text-sky-400 hover:underline">Ask Aida about these →</Link>
          </div>
          {insights.length > 0 ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {insights.map((insight) => (
                <div key={insight.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${insight.tone === "attention" ? "bg-amber-400" : insight.tone === "positive" ? "bg-emerald-400" : insight.tone === "opportunity" ? "bg-violet-400" : "bg-slate-400"}`} />
                    <h3 className="font-medium text-white">{insight.title}</h3>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{insight.body}</p>
                  <Link href={insight.href} className="mt-3 inline-block text-sm text-sky-400 hover:underline">{insight.actionLabel} →</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">As live activity builds, DigitalGate will surface opportunities, risks and recommended actions here.</p>
          )}
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Key metrics</h2>
          <p className="mt-1 text-sm text-slate-500">High-level KPIs with context and direct drill-down to the underlying records.</p>
          <div className="mt-4"><AnalyticsKeyMetricsGrid items={bundle.keyMetrics} /></div>
        </section>

        {operational ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Commercial & operational intelligence</h2>
            <p className="mt-1 text-sm text-slate-500">Native DigitalGate activity — independent of external analytics connectors.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Lead conversion", value: operational.leadConversionRate == null ? "—" : `${operational.leadConversionRate}%`, detail: `${operational.convertedLeads} converted from ${operational.totalLeads} recorded leads` },
                { label: "Opportunity win rate", value: operational.opportunityWinRate == null ? "—" : `${operational.opportunityWinRate}%`, detail: `${operational.wonOpportunities} won from ${operational.totalOpportunities} opportunities` },
                { label: "Open opportunity value", value: formatAudMoney(operational.opportunityPipelineCents), detail: `${operational.openOpportunities} open opportunities` },
                { label: "Weighted forecast", value: formatAudMoney(operational.weightedPipelineCents), detail: "Open opportunity value adjusted by recorded probability" },
                { label: "New contacts", value: String(operational.contactsCreated30d), detail: "Created in the last 30 days" },
                { label: "Activity", value: String(operational.activities30d), detail: "Timeline activities in the last 30 days" },
                { label: "Open tasks", value: String(operational.tasksOpen), detail: "Current operational queue" },
                { label: "Overdue tasks", value: String(operational.tasksOverdue), detail: operational.tasksOverdue > 0 ? "Requires attention" : "Queue clear" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-white">Lead sources</h3>
                <div className="mt-3 space-y-2">
                  {operational.leadSources.length ? operational.leadSources.map((item) => <div key={item.label} className="flex justify-between text-sm"><span className="text-slate-400">{item.label}</span><span className="font-medium text-white">{item.value}</span></div>) : <p className="text-sm text-slate-500">No lead-source evidence yet.</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 p-4">
                <h3 className="text-sm font-semibold text-white">Open opportunity stages</h3>
                <div className="mt-3 space-y-2">
                  {operational.opportunityStages.length ? operational.opportunityStages.map((item) => <div key={item.label} className="flex justify-between text-sm"><span className="text-slate-400">{item.label}</span><span className="font-medium text-white">{item.value}</span></div>) : <p className="text-sm text-slate-500">No open opportunity-stage evidence yet.</p>}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <AnalyticsHealthReference score={bundle.businessHealth} />

        <section className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold text-white">Lead trend</h2><p className="mt-1 text-sm text-slate-500">Eight months of native CRM lead creation.</p></div>
            <Link href="/apps/crm" className="text-sm text-sky-400 hover:underline">Drill down →</Link>
          </div>
          <div className="mt-4"><AnalyticsTrendChart points={bundle.leadTrend} note={bundle.leadTrendNote} /></div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Digital evidence</h2>
          <p className="mt-1 text-sm text-slate-500">Scores and counts from connected systems. Missing data shows exactly where coverage is incomplete.</p>
          <div className="mt-4"><AnalyticsEvidenceGrid items={bundle.evidenceMetrics} /></div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Explore</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Dashboards", "/apps/analytics/dashboard", "Executive, sales, marketing and operations views"],
              ["Reports", "/apps/analytics/reports", "Formal performance reports with evidence commentary"],
              ["Data sources", "/apps/analytics/connectors", "See what is connected and what each source unlocks"],
              ["Intelligence", "/dashboard/insights", "Cross-platform interpretation and recommendations"],
            ].map(([label, href, description]) => <Link key={label} href={href} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 hover:border-slate-700"><p className="font-medium text-white">{label}</p><p className="mt-1 text-xs text-slate-400">{description}</p></Link>)}
          </div>
        </section>
      </main>
    </>
  );
}
