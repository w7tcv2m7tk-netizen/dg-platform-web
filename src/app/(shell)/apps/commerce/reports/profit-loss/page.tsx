import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProfitAndLossReport, parseReportRange } from "@dg/platform-core";

import { ReportDateRangeFilter } from "@/components/commerce/ReportDateRangeFilter";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function ProfitLossReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const session = await getAuthorisedPlatformPageSession("commerce.read");
  if (!session) notFound();

  const range = parseReportRange(sp.from, sp.to);
  const report = await getProfitAndLossReport(session.organisationId, range);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce/reports"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Profit & Loss</h1>
        <p className="text-sm text-slate-400">{report.scopeNote}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <Suspense fallback={null}>
          <ReportDateRangeFilter basePath="/apps/commerce/reports/profit-loss" />
        </Suspense>
        <div className="max-w-2xl space-y-6">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Income
            </h2>
            <ul className="mt-2 divide-y divide-slate-800 border-t border-slate-800">
              {report.income.map((line) => (
                <li
                  key={line.label}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <span className="text-slate-300">
                    {line.label}
                    {line.note ? (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {line.note}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-white">{money(line.amountCents)}</span>
                </li>
              ))}
              <li className="flex justify-between py-3 text-sm font-semibold text-white">
                <span>Total income</span>
                <span>{money(report.incomeTotalCents)}</span>
              </li>
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Expenses
            </h2>
            <ul className="mt-2 divide-y divide-slate-800 border-t border-slate-800">
              {report.expenses.map((line) => (
                <li
                  key={line.label}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <span className="text-slate-300">
                    {line.label}
                    {line.note ? (
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {line.note}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-white">{money(line.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
          <div className="flex justify-between border-t border-slate-700 pt-4 text-lg font-bold text-white">
            <span>Net (Commerce)</span>
            <span>{money(report.netProfitCents)}</span>
          </div>
        </div>
      </main>
    </>
  );
}
