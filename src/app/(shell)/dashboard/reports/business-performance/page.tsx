import Link from "next/link";

import { IntelligenceBusinessReport } from "@/components/intelligence/IntelligenceBusinessReport";
import { IntelligenceFlow } from "@/components/intelligence/IntelligenceFlow";
import { IntelligenceHierarchy } from "@/components/intelligence/IntelligenceHierarchy";
import { loadAnalyticsPageData } from "@/lib/analytics-page-data";

export default async function BusinessPerformanceReportPage() {
  const data = await loadAnalyticsPageData();
  const report = data.bundle.reportTemplates[0];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/reports" className="text-sm text-sky-400 hover:underline">
          ← Reports
        </Link>
        <p className="mt-4 text-xs font-medium uppercase tracking-widest text-blue-400/90">
          Intelligence · Reports
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Performance Report</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Formal communication output generated from your DigitalGate intelligence — not a live
          Analytics dashboard.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {report ? <IntelligenceBusinessReport data={data} report={report} variant="full" /> : null}

        <IntelligenceFlow active="Reports" />
        <IntelligenceHierarchy active="reports" />
      </main>
    </>
  );
}
