import Link from "next/link";
import { getOrganisationMrr } from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

function formatMoney(cents: number, currency = "AUD") {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export default async function CommerceSubscriptionsPage() {
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
          <h1 className="text-2xl font-bold text-white">Subscriptions</h1>
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-slate-300">Database not configured.</p>
          </div>
        </main>
      </>
    );
  }

  const { mrrCents, activeCount, subscriptions } = await getOrganisationMrr(
    session.organisationId,
  );

  return (
    <>
      <header className="dg-page-header">
        <Link
          href="/apps/commerce"
          className="text-sm text-blue-400 hover:underline"
        >
          ← Commerce
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Subscriptions &amp; MRR</h1>
        <p className="text-sm text-slate-400">
          Customer recurring revenue mirrored from payment providers (read-only for now)
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
          <p className="font-medium text-amber-200">Honest scope</p>
          <p className="mt-1 text-slate-400">
            This is your org&apos;s customer subscription ledger and MRR rollup — not DigitalGate
            platform SaaS billing. Create/cancel/pause in Stripe (or your PSP) first; rows sync
            here when webhooks write them. Manual cancel UI ships later.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">MRR</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {formatMoney(mrrCents)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Normalised monthly from active / trialing / past_due
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Active subscriptions
            </p>
            <p className="mt-1 text-2xl font-bold text-white">{activeCount}</p>
            <p className="mt-1 text-xs text-slate-500">
              {subscriptions.length} row(s) total in ledger
            </p>
          </div>
        </div>

        <div className="dg-card dg-table-scroll">
          {!subscriptions.length ? (
            <p className="text-sm text-slate-400">
              No customer subscriptions yet. When Stripe Connect (or another provider) reports a
              subscription, it will appear here and contribute to Commerce MRR.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Provider</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Interval</th>
                  <th className="py-2 font-medium">Period end</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4 text-slate-300">
                      <span className="capitalize">{sub.providerId}</span>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                        {sub.providerSubscriptionId}
                      </p>
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-300">
                      {sub.status.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">
                      {formatMoney(sub.amountCents, sub.currency)}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-400">
                      {sub.interval}
                    </td>
                    <td className="py-3 text-slate-400">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString("en-AU")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
