import Link from "next/link";

import { AnalyticsKeyMetricsGrid } from "@/components/analytics/AnalyticsKeyMetricsGrid";
import { AnalyticsPageIntro } from "@/components/analytics/AnalyticsPageIntro";
import { formatAudMoney, loadAnalyticsPageData } from "@/lib/analytics-page-data";

const DASHBOARD_COPY: Record<
  string,
  { title: string; description: string; metricIds: string[] }
> = {
  executive: {
    title: "Executive dashboard",
    description: "Revenue, leads, pipeline, conversion, health and growth at a glance.",
    metricIds: ["revenue", "leads", "pipeline", "conversion", "contacts", "tasks"],
  },
  sales: {
    title: "Sales dashboard",
    description: "Leads, opportunities, pipeline value, conversion and sales activity.",
    metricIds: ["leads", "pipeline", "conversion", "contacts", "tasks"],
  },
  marketing: {
    title: "Marketing dashboard",
    description: "Lead flow, digital presence, SEO, AI Visibility and reputation signals.",
    metricIds: ["leads", "contacts", "conversion"],
  },
  operations: {
    title: "Operations dashboard",
    description: "Tasks, customers, follow-ups, automation and team activity.",
    metricIds: ["tasks", "contacts", "leads", "pipeline"],
  },
};

export default async function AnalyticsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ dashboard?: string }>;
}) {
  const params = await searchParams;
  const dashboardId = params.dashboard ?? "executive";
  const data = await loadAnalyticsPageData();
  const { bundle, metrics, twinScores } = data;
  const view = DASHBOARD_COPY[dashboardId] ?? DASHBOARD_COPY.executive;

  const filteredMetrics = bundle.keyMetrics.filter((metric) =>
    view.metricIds.includes(metric.id),
  );

  const supplemental = [
    {
      id: "revenue_ytd",
      label: "Revenue YTD",
      value: metrics ? formatAudMoney(metrics.revenueYtdCents) : "—",
      context: "Year to date",
      status: "live" as const,
      href: "/apps/commerce/invoices",
    },
    {
      id: "overdue",
      label: "Overdue follow-ups",
      value: metrics ? String(metrics.overdueFollowUps) : "—",
      context: metrics && metrics.overdueFollowUps > 0 ? "Needs attention" : "Queue clear",
      status: "live" as const,
      href: "/apps/crm/tasks",
    },
    {
      id: "outstanding_ar",
      label: "Outstanding AR",
      value: metrics ? formatAudMoney(metrics.outstandingArCents) : "—",
      context: "Receivables",
      status: "live" as const,
      href: "/apps/commerce/invoices",
    },
  ];

  return (
    <>
      <header className="dg-page-header">
        <AnalyticsPageIntro organisationName={bundle.organisationName} active="/apps/analytics/dashboard" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Predefined dashboards</h2>
          <p className="mt-1 text-sm text-slate-500">
            Start with curated views. Custom dashboard builder comes later.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {bundle.predefinedDashboards.map((dashboard) => {
              const active = dashboard.id === dashboardId;
              return (
                <Link
                  key={dashboard.id}
                  href={dashboard.href}
                  className={
                    active
                      ? "rounded-xl border border-sky-500/40 bg-sky-500/10 px-4 py-4"
                      : "rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 hover:border-slate-700"
                  }
                >
                  <p className="font-medium text-white">{dashboard.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{dashboard.description}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="dg-card">
          <h2 className="font-semibold text-white">{view.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{view.description}</p>
          <div className="mt-4">
            <AnalyticsKeyMetricsGrid items={filteredMetrics} />
          </div>
        </section>

        {(dashboardId === "executive" || dashboardId === "sales" || dashboardId === "operations") && (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Supporting metrics</h2>
            <div className="mt-4">
              <AnalyticsKeyMetricsGrid items={supplemental} />
            </div>
          </section>
        )}

        {dashboardId === "marketing" ? (
          <section className="dg-card">
            <h2 className="font-semibold text-white">Digital presence</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "SEO", value: twinScores.seo, href: "/apps/seo" },
                { label: "AI Visibility", value: twinScores.aiVisibility, href: "/apps/ai-visibility" },
                { label: "Website", value: twinScores.websiteHealth, href: "/apps/websites/health" },
                { label: "Reputation", value: twinScores.reputation, href: "/apps/reviews" },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-slate-700"
                >
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {item.value > 0 ? `${item.value}/100` : "—"}
                  </p>
                  {item.value <= 0 ? (
                    <p className="mt-1 text-xs text-amber-200/80">Not enough connected data</p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-dashed border-slate-700 px-4 py-4 text-sm text-slate-500">
          Create dashboard — coming soon. Predefined views use live connected data only.
        </section>
      </main>
    </>
  );
}
