import Link from "next/link";

import { AnalyticsReportExport } from "@/components/analytics/AnalyticsReportExport";
import { AnalyticsPageIntro } from "@/components/analytics/AnalyticsPageIntro";
import { AnalyticsSubnav } from "@/components/analytics/AnalyticsSubnav";
import { formatAudMoney, loadAnalyticsPageData } from "@/lib/analytics-page-data";

export default async function AnalyticsReportsPage() {
  const data = await loadAnalyticsPageData();
  const { bundle, metrics, twinScores, connectors, profile } = data;
  const report = bundle.reportTemplates[0];
  const generatedAt = bundle.generatedAt;

  const snapshot = {
    generatedAt,
    organisationName: bundle.organisationName,
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

  const evidenceLines = [
    { label: "Leads", value: metrics ? String(metrics.vendorLeadCount + metrics.buyerLeadCount) : "—" },
    { label: "Pipeline", value: metrics ? formatAudMoney(metrics.pipelineValueCents) : "—" },
    { label: "Revenue MTD", value: metrics ? formatAudMoney(metrics.revenueMtdCents) : "—" },
    { label: "Contacts", value: metrics ? String(metrics.contactCount) : "—" },
    { label: "Tasks due", value: metrics ? String(metrics.openTasksDue) : "—" },
    { label: "Overdue follow-ups", value: metrics ? String(metrics.overdueFollowUps) : "—" },
  ];

  return (
    <>
      <header className="dg-page-header">
        <AnalyticsPageIntro organisationName={bundle.organisationName} active="/apps/analytics/reports" />
        <AnalyticsSubnav active="/apps/analytics/reports" />
      </header>
      <main className="dg-page-main space-y-6">
        {report ? (
          <section className="dg-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">{report.periodLabel}</p>
                <h2 className="mt-1 text-xl font-semibold text-white">{report.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{bundle.organisationName}</p>
              </div>
              <AnalyticsReportExport snapshot={snapshot} />
            </div>

            <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90">
                AI-generated commentary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{report.commentary}</p>
              <Link href="/dashboard/advisor" className="mt-3 inline-block text-sm text-sky-400 hover:underline">
                Open AI Advisor for recommendations →
              </Link>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Report sections
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {report.sections.map((section) => (
                    <li key={section}>· {section}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Evidence snapshot
                </h3>
                <dl className="mt-3 divide-y divide-slate-800">
                  {evidenceLines.map((line) => (
                    <div
                      key={line.label}
                      className="flex items-center justify-between gap-2 py-2 text-sm"
                    >
                      <dt className="text-slate-400">{line.label}</dt>
                      <dd className="font-medium text-white">{line.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-dashed border-slate-700 px-4 py-4 text-sm text-slate-500">
          Scheduled reports and PDF export — coming soon. JSON export captures the current evidence
          snapshot without inventing data.
        </section>

        {!metrics ? (
          <section className="dg-card border-amber-500/30">
            <p className="text-sm text-amber-200">
              Live metrics are unavailable. Export includes connector status only — no fabricated
              numbers.
            </p>
          </section>
        ) : null}
      </main>
    </>
  );
}
