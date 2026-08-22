import Link from "next/link";

import type { AnalyticsPageData } from "@/lib/analytics-page-data";

type ReportTemplate = AnalyticsPageData["bundle"]["reportTemplates"][number];

export function IntelligenceBusinessReport({
  data,
  report,
  variant = "preview",
}: {
  data: AnalyticsPageData;
  report: ReportTemplate;
  variant?: "preview" | "full";
}) {
  return (
    <section className="dg-card" id="report">
      <p className="text-xs uppercase tracking-wide text-slate-500">{report.periodLabel}</p>
      <h2 className="mt-1 text-xl font-semibold text-white">{report.title}</h2>
      <p className="mt-2 text-sm text-slate-400">{data.bundle.organisationName}</p>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Executive summary
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-200">{report.commentary}</p>
      </div>

      <ul className={`mt-6 grid gap-2 ${variant === "full" ? "sm:grid-cols-2" : ""}`}>
        {report.sections.map((section) => (
          <li
            key={section}
            className="rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-300"
          >
            {section}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-3">
        {variant === "preview" ? (
          <Link
            href="/dashboard/reports/business-performance"
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            View Report →
          </Link>
        ) : (
          <span className="rounded-full bg-violet-600/20 px-4 py-2 text-sm font-semibold text-violet-100">
            Business Performance Report
          </span>
        )}
        <Link href="/apps/analytics" className="text-sm text-sky-400 hover:underline">
          Open Analytics →
        </Link>
        <Link href="/dashboard/advisor" className="text-sm text-sky-400 hover:underline">
          Ask AI Advisor →
        </Link>
      </div>

      {variant === "full" ? (
        <p className="mt-4 text-xs text-slate-500">
          Download PDF · Share report · Schedule delivery — coming soon.
        </p>
      ) : null}
    </section>
  );
}
