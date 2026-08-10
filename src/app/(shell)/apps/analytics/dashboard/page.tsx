import Link from "next/link";

import { AnalyticsKpiGrid } from "@/components/analytics/AnalyticsKpiGrid";
import { AnalyticsSubnav } from "@/components/analytics/AnalyticsSubnav";
import { formatAudMoney, loadAnalyticsPageData } from "@/lib/analytics-page-data";

function HealthTrendChart({ values }: { values: number[] }) {
  if (values.length < 2) {
    return (
      <p className="text-sm text-slate-500">
        Health trend appears after multiple snapshots are recorded.
      </p>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 280;
  const h = 80;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full text-blue-400" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

const SCORE_STRIP = [
  { id: "seo", label: "SEO", key: "seo" as const },
  { id: "ai_visibility", label: "AI Visibility", key: "aiVisibility" as const },
  { id: "website_health", label: "Website", key: "websiteHealth" as const },
  { id: "reputation", label: "Reputation", key: "reputation" as const },
];

export default async function AnalyticsDashboardPage() {
  const data = await loadAnalyticsPageData();
  const { metrics, twinScores, healthTrend } = data;

  const kpis = [
    {
      id: "new_leads",
      label: "New leads this week",
      value: metrics ? String(metrics.newLeadsThisWeek) : "—",
    },
    {
      id: "overdue",
      label: "Overdue follow-ups",
      value: metrics ? String(metrics.overdueFollowUps) : "—",
      href: "/apps/crm/tasks",
    },
    {
      id: "tasks",
      label: "Open tasks due",
      value: metrics ? String(metrics.openTasksDue) : "—",
      href: "/apps/crm/tasks",
    },
    {
      id: "revenue_ytd",
      label: "Revenue YTD",
      value: metrics ? formatAudMoney(metrics.revenueYtdCents) : "—",
    },
    {
      id: "outstanding_ar",
      label: "Outstanding AR",
      value: metrics ? formatAudMoney(metrics.outstandingArCents) : "—",
    },
    {
      id: "listed",
      label: "Listed properties",
      value: metrics ? String(metrics.listedPropertyCount) : "—",
      href: "/apps/re/listings",
    },
  ];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/analytics" className="text-sm text-blue-400 hover:underline">
          ← Analytics overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Analytics dashboard</h1>
        <p className="text-sm text-slate-400">{data.organisationName}</p>
        <AnalyticsSubnav active="/apps/analytics/dashboard" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Business Health</p>
              <p className="mt-1 text-4xl font-bold text-emerald-400">
                {twinScores.businessHealth}
                <span className="text-lg text-slate-500">/100</span>
              </p>
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="mb-2 text-xs text-slate-500">Health trend</p>
              <HealthTrendChart values={healthTrend} />
            </div>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SCORE_STRIP.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm"
              >
                <span className="text-slate-400">{s.label}</span>
                <span className="font-semibold text-white">{twinScores[s.key]}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">Operational KPIs</h2>
          <div className="mt-4">
            <AnalyticsKpiGrid items={kpis} />
          </div>
        </section>
      </main>
    </>
  );
}
