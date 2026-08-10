import Link from "next/link";

import { AnalyticsReportExport } from "@/components/analytics/AnalyticsReportExport";
import { AnalyticsSubnav } from "@/components/analytics/AnalyticsSubnav";
import { formatAudMoney, loadAnalyticsPageData } from "@/lib/analytics-page-data";

export default async function AnalyticsReportsPage() {
  const data = await loadAnalyticsPageData();
  const { metrics, twinScores, connectors, profile } = data;
  const generatedAt = new Date().toISOString();

  const snapshot = {
    generatedAt,
    organisationName: data.organisationName,
    metrics: metrics
      ? {
          contactCount: metrics.contactCount,
          vendorLeadCount: metrics.vendorLeadCount,
          buyerLeadCount: metrics.buyerLeadCount,
          newLeadsThisWeek: metrics.newLeadsThisWeek,
          overdueFollowUps: metrics.overdueFollowUps,
          pipelineValueCents: metrics.pipelineValueCents,
          revenueMtdCents: metrics.revenueMtdCents,
          revenueYtdCents: metrics.revenueYtdCents,
          outstandingArCents: metrics.outstandingArCents,
          listedPropertyCount: metrics.listedPropertyCount,
          openTasksDue: metrics.openTasksDue,
        }
      : null,
    scores: twinScores,
    connectors: {
      website: connectors.website?.ok ?? false,
      wordpress: connectors.wordpress?.ok ?? false,
      stripe: connectors.stripeOk ?? false,
    },
    profile: profile
      ? {
          websiteUrl: profile.websiteUrl ?? null,
          tradingName: profile.tradingName ?? profile.businessName ?? null,
        }
      : null,
  };

  const reportLines = [
    { label: "Report generated", value: new Date(generatedAt).toLocaleString("en-AU") },
    {
      label: "Total leads",
      value: metrics ? String(metrics.vendorLeadCount + metrics.buyerLeadCount) : "—",
    },
    {
      label: "Pipeline",
      value: metrics ? formatAudMoney(metrics.pipelineValueCents) : "—",
    },
    {
      label: "Revenue MTD",
      value: metrics ? formatAudMoney(metrics.revenueMtdCents) : "—",
    },
    { label: "Contacts", value: metrics ? String(metrics.contactCount) : "—" },
    { label: "Business Health", value: `${twinScores.businessHealth}/100` },
    { label: "SEO score", value: `${twinScores.seo}/100` },
    { label: "AI Visibility", value: `${twinScores.aiVisibility}/100` },
    { label: "Website Health", value: `${twinScores.websiteHealth}/100` },
    { label: "Reputation", value: `${twinScores.reputation}/100` },
  ];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/apps/analytics" className="text-sm text-blue-400 hover:underline">
          ← Analytics overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Analytics reports</h1>
        <p className="text-sm text-slate-400">Readable snapshot of current Neon metrics</p>
        <AnalyticsSubnav active="/apps/analytics/reports" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-white">Current metrics report</h2>
              <p className="mt-1 text-sm text-slate-400">{data.organisationName}</p>
            </div>
            <AnalyticsReportExport snapshot={snapshot} />
          </div>
          <dl className="mt-6 divide-y divide-slate-800">
            {reportLines.map((line) => (
              <div
                key={line.label}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <dt className="text-slate-400">{line.label}</dt>
                <dd className="font-medium text-white">{line.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {!metrics ? (
          <section className="dg-card border-amber-500/30">
            <p className="text-sm text-amber-200">
              Live metrics are unavailable — the JSON export includes score defaults and connector
              status only.
            </p>
          </section>
        ) : null}
      </main>
    </>
  );
}
