import Link from "next/link";
import { Suspense } from "react";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { getCashFlowReport, parseReportRange } from "@dg/platform-core";

import { ReportDateRangeFilter } from "@/components/commerce/ReportDateRangeFilter";
import { fetchPortalMe } from "@/lib/dg-api";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function CashFlowReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  if (!session) {
    return (
      <main className="dg-page-main">
        <p className="text-slate-300">Database not configured.</p>
      </main>
    );
  }

  const range = parseReportRange(sp.from, sp.to);
  const report = await getCashFlowReport(session.organisationId, range);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce/reports"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Cash Flow</h1>
        <p className="text-sm text-slate-400">{report.scopeNote}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <Suspense fallback={null}>
          <ReportDateRangeFilter basePath="/apps/commerce/reports/cash-flow" />
        </Suspense>
        <p className="text-sm text-slate-500">
          {report.paymentCount} payment(s) · {report.refundCount} refund(s)
        </p>
        <div className="max-w-2xl space-y-6">
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Operating inflows
            </h2>
            <ul className="mt-2 divide-y divide-slate-800 border-t border-slate-800">
              {report.operatingInflows.map((line) => (
                <li
                  key={line.label}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <span className="text-slate-300">{line.label}</span>
                  <span className="text-white">{money(line.amountCents)}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Operating outflows
            </h2>
            <ul className="mt-2 divide-y divide-slate-800 border-t border-slate-800">
              {report.operatingOutflows.map((line) => (
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
            <span>Net cash (Commerce)</span>
            <span>{money(report.netCashCents)}</span>
          </div>
        </div>
      </main>
    </>
  );
}
