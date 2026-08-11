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
        <Link href="/dashboard" className="text-sm text-sky-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-slate-400">
          Live Neon KPIs for {data.organisationName} — closed beta
        </p>
        <AnalyticsSubnav active="/apps/analytics" />
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3 text-sm text-slate-400">
          Beta floor: CRM/commerce counts from Neon. Twin score strip is provisional unless a
          presence audit or review feed supplies real inputs. Growth MRR / Stripe attribution stays
          out of scope here.
        </div>

        {!metrics ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">
              Sign in with a Neon-backed organisation to load live KPIs. Nothing below invents demo
              charts.
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
              <h2 className="font-semibold text-white">Score strip</h2>
              <p className="mt-1 text-xs text-slate-500">
                Business Health: {metrics ? `${twinScores.businessHealth}/100` : "—"} (provisional
                Twin blend)
              </p>
            </div>
            <Link href="/apps/analytics/dashboard" className="text-sm text-sky-400 hover:underline">
              Open dashboard →
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {SCORE_CARDS.map((card) => {
              const raw = twinScores[card.key];
              const empty = !metrics || (card.id === "reputation" && raw === 0);
              return (
                <Link
                  key={card.id}
                  href={card.href}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-slate-700"
                >
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className="mt-1 text-3xl font-bold text-white">{empty ? "—" : raw}</p>
                  {!empty ? <p className="text-xs text-slate-500">/ 100</p> : null}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-300">
            <li>
              <Link href="/apps/analytics/dashboard" className="text-sky-400 hover:underline">
                Dashboard
              </Link>{" "}
              — KPI cards and health history when recorded
            </li>
            <li>
              <Link href="/apps/analytics/reports" className="text-sky-400 hover:underline">
                Reports
              </Link>{" "}
              — export a JSON snapshot of current metrics
            </li>
            <li>
              <Link href="/apps/analytics/connectors" className="text-sky-400 hover:underline">
                Data sources
              </Link>{" "}
              — Neon live vs planned OAuth connectors (no fake GA/Meta)
            </li>
          </ul>
        </section>
      </main>
    </>
  );
}
