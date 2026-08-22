import Link from "next/link";

import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import { loadAnalyticsPageData } from "@/lib/analytics-page-data";

export default async function IntelligenceReportsPage() {
  const data = await loadAnalyticsPageData();
  const report = data.bundle.reportTemplates[0];

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-medium uppercase tracking-widest text-blue-400/90">
          Intelligence · Reports
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          What do we need to communicate or export? Formal, reportable views for owners, boards and
          stakeholders — distinct from day-to-day Analytics dashboards.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {report ? (
          <section className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">{report.periodLabel}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{report.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{data.bundle.organisationName}</p>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Executive summary
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-200">{report.commentary}</p>
            </div>

            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {report.sections.map((section) => (
                <li key={section} className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300">
                  {section}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/apps/analytics/reports"
                className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
              >
                Open full report in Analytics →
              </Link>
              <Link href="/dashboard/advisor" className="text-sm text-sky-400 hover:underline">
                Ask AI Advisor →
              </Link>
            </div>
          </section>
        ) : null}

        <section className="rounded-xl border border-dashed border-slate-700 px-4 py-4 text-sm text-slate-500">
          Scheduled delivery, PDF export and stakeholder sharing — coming soon. Reports use live
          connected data only.
        </section>

        <IntelligenceFlow active="Reports" />
        <IntelligenceHierarchy active="reports" />
      </main>
    </>
  );
}
