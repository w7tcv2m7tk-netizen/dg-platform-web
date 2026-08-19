import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {
  getCommerceFinancialSnapshot,
  listInvoices,
  listQuotes,
  scanOverdueCommerceInvoices,
} from "@dg/platform-core";

import { fetchPortalMe } from "@/lib/dg-api";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(cents / 100);
}

export default async function CommerceOverviewPage() {
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
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Commerce</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  // Mark past-due invoices + fire overdue automations (idempotent).
  await scanOverdueCommerceInvoices(session.organisationId).catch(() => null);

  const [snapshot, quotes, invoices] = await Promise.all([
    getCommerceFinancialSnapshot(session.organisationId),
    listQuotes(session.organisationId, 5),
    listInvoices(session.organisationId, 5),
  ]);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Commerce</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · payments, quotes & invoices
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Revenue MTD
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatMoney(snapshot.revenueMtdCents)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Revenue YTD
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatMoney(snapshot.revenueYtdCents)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Outstanding AR
            </p>
            <p className="mt-1 text-2xl font-bold text-amber-300">
              {formatMoney(snapshot.outstandingArCents)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Overdue AR
            </p>
            <p className="mt-1 text-2xl font-bold text-red-300">
              {formatMoney(snapshot.overdueArCents)}
            </p>
          </div>
          <Link
            href="/apps/commerce/subscriptions"
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 hover:border-slate-600"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">MRR</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">
              {formatMoney(snapshot.mrrCents)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {snapshot.activeSubscriptions} active sub(s)
            </p>
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="dg-card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent quotes</h2>
              <Link
                href="/apps/commerce/quotes"
                className="text-sm text-blue-400 hover:underline"
              >
                View all →
              </Link>
            </div>
            {!quotes.length ? (
              <p className="mt-3 text-sm text-slate-400">No quotes yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {quotes.map((quote) => (
                  <li
                    key={quote.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/apps/commerce/quotes/${quote.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      {quote.quoteNumber}
                    </Link>
                    <span className="text-slate-400">
                      {formatMoney(quote.totalCents)} · {quote.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dg-card">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Recent invoices</h2>
              <Link
                href="/apps/commerce/invoices"
                className="text-sm text-blue-400 hover:underline"
              >
                View all →
              </Link>
            </div>
            {!invoices.length ? (
              <p className="mt-3 text-sm text-slate-400">No invoices yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {invoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <Link
                      href={`/apps/commerce/invoices/${invoice.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <span className="text-slate-400">
                      {formatMoney(invoice.totalCents)} · {invoice.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/apps/commerce/quotes"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Quotes
          </Link>
          <Link
            href="/apps/commerce/invoices"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Invoices
          </Link>
          <Link
            href="/apps/commerce/products"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Products
          </Link>
          <Link
            href="/apps/commerce/subscriptions"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Subscriptions
          </Link>
          <Link
            href="/apps/commerce/reports"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Reports
          </Link>
          <Link
            href="/apps/automation"
            className="rounded-full bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700"
          >
            Automation
          </Link>
          <Link
            href="/apps/re/vendor-leads"
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm text-white hover:bg-emerald-600"
          >
            Request payment (RE)
          </Link>
        </div>
      </main>
    </>
  );
}
