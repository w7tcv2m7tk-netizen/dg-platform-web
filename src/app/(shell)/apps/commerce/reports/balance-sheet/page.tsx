import Link from "next/link";
import { Suspense } from "react";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { getBalanceSheetReport } from "@dg/platform-core";

import { ReportDateRangeFilter } from "@/components/commerce/ReportDateRangeFilter";
import { fetchPortalMe } from "@/lib/dg-api";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function BalanceSheetReportPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string }>;
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

  const asOf = sp.to ? new Date(sp.to) : new Date();
  const report = await getBalanceSheetReport(session.organisationId, asOf);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce/reports"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Balance Sheet</h1>
        <p className="text-sm text-slate-400">{report.scopeNote}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <Suspense fallback={null}>
          <ReportDateRangeFilter basePath="/apps/commerce/reports/balance-sheet" />
        </Suspense>
        <p className="text-xs text-amber-200/80">
          As of {new Date(report.asOf).toLocaleDateString("en-AU")} — scaffolded from
          Commerce AR & payments only.
        </p>
        <div className="max-w-2xl space-y-6">
          {(
            [
              ["Assets", report.assets, report.totalAssetsCents],
              ["Liabilities", report.liabilities, report.totalLiabilitiesCents],
              ["Equity", report.equity, report.totalEquityCents],
            ] as const
          ).map(([title, lines, total]) => (
            <section key={title}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {title}
              </h2>
              <ul className="mt-2 divide-y divide-slate-800 border-t border-slate-800">
                {lines.map((line) => (
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
                  <span>Total {title.toLowerCase()}</span>
                  <span>{money(total)}</span>
                </li>
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
