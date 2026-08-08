import Link from "next/link";
import { Suspense } from "react";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import { getGstReport, parseReportRange } from "@dg/platform-core";

import { ReportDateRangeFilter } from "@/components/commerce/ReportDateRangeFilter";
import { fetchPortalMe } from "@/lib/dg-api";

function money(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function GstReportPage({
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
  const report = await getGstReport(session.organisationId, range);

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce/reports"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">GST / Sales Tax</h1>
        <p className="text-sm text-slate-400">{report.scopeNote}</p>
      </header>
      <main className="dg-page-main space-y-6">
        <Suspense fallback={null}>
          <ReportDateRangeFilter basePath="/apps/commerce/reports/gst" />
        </Suspense>

        <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs uppercase text-slate-500">Taxable sales (ex GST)</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {money(report.taxableSalesExGstCents)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs uppercase text-slate-500">GST on sales</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {money(report.gstOnSalesCents)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs uppercase text-slate-500">GST-free sales</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {money(report.gstFreeSalesCents)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-xs uppercase text-slate-500">Net GST</p>
            <p className="mt-1 text-xl font-semibold text-white">
              {money(report.netGstCents)}
            </p>
          </div>
        </div>

        <div className="dg-card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Issued</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Ex GST</th>
                <th className="py-2 pr-4">GST</th>
                <th className="py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((line) => (
                <tr
                  key={`${line.invoiceNumber}-${line.issuedAt}`}
                  className="border-b border-slate-800/60"
                >
                  <td className="py-2 pr-4 text-white">{line.invoiceNumber}</td>
                  <td className="py-2 pr-4 text-slate-400">
                    {new Date(line.issuedAt).toLocaleDateString("en-AU")}
                  </td>
                  <td className="py-2 pr-4 capitalize text-slate-300">
                    {line.status.replace(/_/g, " ")}
                  </td>
                  <td className="py-2 pr-4 text-slate-300">
                    {money(line.subtotalCents)}
                  </td>
                  <td className="py-2 pr-4 text-slate-300">{money(line.taxCents)}</td>
                  <td className="py-2 text-slate-300">{money(line.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!report.lines.length ? (
            <p className="py-6 text-center text-sm text-slate-400">
              No issued invoices in this range.
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
