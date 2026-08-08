import Link from "next/link";

const REPORTS = [
  {
    href: "/apps/commerce/reports/profit-loss",
    title: "Profit & Loss",
    blurb: "Sales receipts from paid invoices and Commerce payments.",
    real: true,
  },
  {
    href: "/apps/commerce/reports/gst",
    title: "GST / Sales Tax",
    blurb: "AU GST collected on issued invoices — BAS-oriented summary.",
    real: true,
  },
  {
    href: "/apps/commerce/reports/balance-sheet",
    title: "Balance Sheet",
    blurb: "AR + cash collected scaffold — not a full ledger.",
    real: false,
  },
  {
    href: "/apps/commerce/reports/cash-flow",
    title: "Cash Flow",
    blurb: "Operating inflows/outflows from payments and refunds.",
    real: true,
  },
] as const;

export default function CommerceReportsIndexPage() {
  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Reports</h1>
        <p className="text-sm text-slate-400">
          Financial summaries from DigitalGate invoices & payments (AU-first).
        </p>
      </header>
      <main className="dg-page-main space-y-4">
        <p className="max-w-2xl text-sm text-slate-400">
          These reports use real Commerce data where available. Balance Sheet is
          scaffolded from AR and settled payments — DigitalGate is not a
          general ledger.
        </p>
        <ul className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden">
          {REPORTS.map((report) => (
            <li key={report.href}>
              <Link
                href={report.href}
                className="flex flex-col gap-1 bg-slate-950/40 px-5 py-4 hover:bg-slate-900/60 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{report.title}</p>
                  <p className="text-sm text-slate-400">{report.blurb}</p>
                </div>
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  {report.real ? "Live data" : "Scaffolded"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
