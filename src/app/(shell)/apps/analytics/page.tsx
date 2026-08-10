import Link from "next/link";

import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsSubnav } from "@/components/analytics/AnalyticsSubnav";
import { formatAudMoney, loadAnalyticsPageData } from "@/lib/analytics-page-data";

const SCORE_CARDS = [
  { id: "ai_visibility", label: "AI Visibility", key: "aiVisibility" as const, href: "/apps/ai-visibility" },
  { id: "seo", label: "SEO", key: "seo" as const, href: "/apps/seo" },
  { id: "website_health", label: "Website Health", key: "websiteHealth" as const, href: "/apps/websites/health" },
  { id: "reputation", label: "Reputation", key: "reputation" as const, href: "/apps/reviews" },
];

export default async function AnalyticsOverviewPage() {
  const data = await loadAnalyticsPageData();
  const { metrics, twinScores } = data;
  const totalLeads = metrics
    ? metrics.vendorLeadCount + metrics.buyerLeadCount
    : null;

  const kpis = [
    {
      id: "leads",
      label: "Total leads",
      value: totalLeads != null ? String(totalLeads) : "—",
      href: "/apps/crm/contacts",
    },
    {
      id: "pipeline",
      label: "Pipeline value",
      value: metrics ? formatAudMoney(metrics.pipelineValueCents) : "—",
      href: "/apps/crm/opportunities",
    },
    {
      id: "revenue",
      label: "Revenue MTD",
      value: metrics ? formatAudMoney(metrics.revenueMtdCents) : "—",
      href: "/apps/commerce/invoices",
    },
    {
      id: "contacts",
      label: "Contacts",
      value: metrics ? String(metrics.contactCount) : "—",
      href: "/apps/crm/contacts",
    },
  ];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-400">
          Live KPIs from Neon for {data.organisationName}
        </p>
        <AnalyticsSubnav active="/apps/analytics" />
      </header>
      <main className="dg-page-main space-y-6">
        {!metrics ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">
              Connect your database to load live analytics. KPIs and scores preview below use
              defaults until Neon data is available.
            </p>
          </div>
        ) : null}

        <section className="dg-card">
          <h2 className="font-semibold text-white">Key metrics</h2>
          <div className="mt-4">
            <AnalyticsKpiGrid items={kpis} />
          </div>
        </section>

        <section className="dg-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Digital Twin scores</h2>
              <p className="mt-1 text-xs text-slate-500">
                Business Health: {twinScores.businessHealth}/100
              </p>
            </div>
            <Link href="/apps/analytics/dashboard" className="text-sm text-blue-400 hover:underline">
              Open dashboard →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCORE_CARDS.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-slate-700"
              >
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="mt-1 text-3xl font-bold text-white">{twinScores[card.key]}</p>
                <p className="text-xs text-slate-500">/ 100</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/apps/analytics/dashboard" className="text-blue-400 hover:underline">
                Dashboard
              </Link>{" "}
              — score strip, health trend, and KPI cards
            </li>
            <li>
              <Link href="/apps/analytics/reports" className="text-blue-400 hover:underline">
                Reports
              </Link>{" "}
              — export a JSON snapshot of current metrics
            </li>
            <li>
              <Link href="/apps/analytics/connectors" className="text-blue-400 hover:underline">
                Data sources
              </Link>{" "}
              — what is live from Neon vs planned OAuth connectors
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
