import Link from "next/link";

import { IntelligenceBusinessReport } from "@/components/intelligence/IntelligenceBusinessReport";
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
        {report ? <IntelligenceBusinessReport data={data} report={report} variant="preview" /> : null}

        <section className="rounded-xl border border-dashed border-slate-700 px-4 py-4 text-sm text-slate-500">
          Scheduled delivery, PDF export and stakeholder sharing — coming soon. Reports use live
          connected data only — not fabricated numbers.
        </section>

        <IntelligenceFlow active="Reports" />
        <IntelligenceHierarchy active="reports" />
      </main>
    </>
  );
}
