import Link from "next/link";
import { getCommandCentreOpsHome } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";

function formatAudCents(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function CommandRevenuePage() {
  const data = process.env.DATABASE_URL ? await getCommandCentreOpsHome() : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Revenue intelligence</h1>
        <p className="mt-1 text-sm text-slate-400">
          Commerce subscriptions, paid invoices, and Refer &amp; Earn — ARR/churn after Stripe MRR
          pipeline.
        </p>
      </header>
      <main className="flex-1 space-y-8 p-6 md:p-8">
        <CommandCentreNav active="revenue" />

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — revenue snapshot unavailable.
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-lg font-semibold text-white">Commercial snapshot</h2>
              <p className="mt-1 text-sm text-slate-400">
                Estimated MRR from active monthly commerce subscriptions.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Est. MRR</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {data.billing.estimatedMrrLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Invoices paid MTD</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {data.billing.invoicePaidMtdLabel}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Active subscriptions</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {data.billing.activeSubscriptions}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Stripe customers</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {data.billing.orgsWithBillingCustomer}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Stripe mode: {data.billing.stripeMode}
                {data.billing.stripeOk ? " · configured" : " · setup incomplete"}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Refer &amp; Earn</h2>
              <p className="mt-1 text-sm text-slate-400">
                Platform SaaS referrals — not the Business Referral Network.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Total referrals</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {data.referEarn.totalReferrals}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Signed up+</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{data.referEarn.signedUp}</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
                  <p className="mt-1 text-3xl font-semibold text-white">{data.referEarn.paid}</p>
                </div>
                <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Credits MTD</p>
                  <p className="mt-1 text-3xl font-semibold text-white">
                    {formatAudCents(data.referEarn.creditsMtdCents)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/settings/referrals"
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                >
                  Refer &amp; Earn dashboard
                </Link>
                <Link
                  href="/apps/commerce/reports"
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
                >
                  Commerce reports
                </Link>
                <Link
                  href="/dashboard/settings/billing"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Billing settings
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
