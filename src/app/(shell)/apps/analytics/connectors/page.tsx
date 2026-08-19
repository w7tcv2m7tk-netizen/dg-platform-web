import Link from "next/link";

import { AnalyticsSubnav } from "@/components/analytics/AnalyticsSubnav";
import { loadAnalyticsPageData } from "@/lib/analytics-page-data";

const PLANNED_CONNECTORS = [
  {
    id: "ga",
    label: "Google Analytics",
    note: "Requires OAuth — not connected in Platform 1.0",
  },
  {
    id: "meta",
    label: "Meta (Facebook / Instagram)",
    note: "Requires OAuth for ads and page insights — not connected",
  },
  {
    id: "ads",
    label: "Google Ads",
    note: "Requires OAuth — campaign spend not imported yet",
  },
];

export default async function AnalyticsConnectorsPage() {
  const data = await loadAnalyticsPageData();
  const { metrics, connectors } = data;

  const liveSources = [
    {
      id: "neon",
      label: "Neon (Postgres)",
      status: metrics ? "Live" : "Unavailable",
      detail: metrics
        ? "CRM, leads, commerce, tasks, and activity counts"
        : "Platform database unavailable",
      ok: Boolean(metrics),
    },
    {
      id: "website",
      label: "Website health probe",
      status: connectors.website?.ok ? "Connected" : "Not connected",
      detail: connectors.website?.ok
        ? `Score ${connectors.website.score ?? "—"}/100${connectors.website.siteLabel ? ` · ${connectors.website.siteLabel}` : ""}`
        : "Add a live website or enable Design Studio health checks",
      ok: connectors.website?.ok ?? false,
    },
    ...(connectors.wordpress?.configured
      ? [
          {
            id: "wordpress",
            label: "WordPress sync",
            status: connectors.wordpress?.ok ? "Connected" : "Not connected",
            detail: connectors.wordpress?.lastSyncAt
              ? `Last sync ${new Date(connectors.wordpress.lastSyncAt).toLocaleString("en-AU")}`
              : "Pipeline and listing data when RE / accommodation apps enabled",
            ok: connectors.wordpress?.ok ?? false,
          },
        ]
      : []),
    {
      id: "stripe",
      label: "Stripe billing",
      status: connectors.stripeOk ? "Configured" : "Not configured",
      detail: connectors.stripeMode ? `Mode: ${connectors.stripeMode}` : "Commerce revenue KPIs",
      ok: connectors.stripeOk ?? false,
    },
  ];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/analytics" className="text-sm text-blue-400 hover:underline">
          ← Analytics overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Data sources</h1>
        <p className="text-sm text-slate-400">Live Neon data vs planned marketing connectors</p>
        <AnalyticsSubnav active="/apps/analytics/connectors" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <h2 className="font-semibold text-white">Live today</h2>
          <p className="mt-1 text-sm text-slate-400">
            These sources feed Analytics KPIs and Digital Twin scores without third-party OAuth.
          </p>
          <ul className="mt-4 space-y-3">
            {liveSources.map((source) => (
              <li
                key={source.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-white">{source.label}</p>
                  <span
                    className={
                      source.ok
                        ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                        : "rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                    }
                  >
                    {source.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{source.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/dashboard/settings/connectors" className="text-blue-400 hover:underline">
              Manage connectors →
            </Link>
          </p>
        </section>

        <section className="dg-card border-blue-500/20">
          <h2 className="font-semibold text-white">Planned — OAuth required</h2>
          <p className="mt-1 text-sm text-slate-400">
            GA, Meta, and Ads integrations are on the roadmap. We are not simulating OAuth or
            importing fake ad metrics.
          </p>
          <ul className="mt-4 space-y-3">
            {PLANNED_CONNECTORS.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-dashed border-slate-700 px-4 py-3"
              >
                <p className="font-medium text-slate-300">{item.label}</p>
                <p className="mt-1 text-sm text-slate-500">{item.note}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
