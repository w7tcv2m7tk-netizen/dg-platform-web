import Link from "next/link";
import { redirect } from "next/navigation";
import { getCommandCentreOpsHome, getCommandMrrAttribution } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function billingLabel(interval: string): string {
  if (interval === "month") return "Monthly";
  if (interval === "year") return "Annual";
  return interval;
}

function statusLabel(status: string): string {
  if (status === "trialing") return "Trial";
  if (status === "active") return "Active";
  return status;
}

export default async function CommandRevenuePage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const db = Boolean(process.env.DATABASE_URL);
  const [data, attribution] = db
    ? await Promise.all([getCommandCentreOpsHome(), getCommandMrrAttribution()])
    : [null, null];

  return (
    <>
      <header className="dg-page-header">
        <OperatorCategoryHeader
          eyebrow="Commercial"
          title="Revenue / MRR"
          question="DigitalGate revenue, recurring revenue, subscriptions and commercial performance."
          backHref="/command"
          backLabel="Command Centre"
        />
      </header>
      <main className="dg-page-main space-y-8">
        {!data || !attribution ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — revenue snapshot unavailable.
          </div>
        ) : (
          <>
            {!data.billing.stripeOk ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100">
                Stripe setup incomplete ({data.billing.stripeMode}). Billing figures may be
                incomplete until configuration is finished.{" "}
                <Link
                  href="/dashboard/settings/billing"
                  className="text-sky-300 hover:underline"
                >
                  Billing settings →
                </Link>
              </div>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Snapshot</h2>
              <OperatorMetricStrip
                metrics={[
                  {
                    label: "MRR",
                    value: attribution.monthlyMrrLabel,
                    tone: "sky",
                  },
                  {
                    label: "ARR",
                    value: attribution.arrLabel,
                  },
                  {
                    label: "Revenue MTD",
                    value: data.billing.invoicePaidMtdLabel,
                  },
                  {
                    label: "Active subscriptions",
                    value: data.billing.activeSubscriptions,
                  },
                  {
                    label: "Trials",
                    value: attribution.trialCount,
                  },
                  {
                    label: "Annual subscriptions",
                    value: attribution.annualCount,
                  },
                  {
                    label: "Stripe customers",
                    value: data.billing.orgsWithBillingCustomer,
                  },
                ]}
                columnsClassName="sm:grid-cols-2 lg:grid-cols-4"
              />
              <p className="text-sm text-slate-400">
                <span className="font-medium text-slate-300">MRR</span> is recurring subscription
                value (monthly interval only in the MRR figure; annual contributes via ARR). It is
                not the same as{" "}
                <span className="font-medium text-slate-300">revenue received</span> (invoices paid
                MTD) or Growth Engine{" "}
                <span className="font-medium text-slate-300">MRR Won</span>.
              </p>
              <p className="text-xs text-slate-500">
                Stripe mode: {data.billing.stripeMode}
                {data.billing.stripeOk ? " · configured" : " · setup incomplete"}
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">MRR by organisation</h2>
              <p className="mt-1 text-sm text-slate-400">
                {attribution.monthlyMrrLabel} monthly MRR · {attribution.arrLabel} ARR from{" "}
                {attribution.activeSubscriptionCount} active/trialing subscription
                {attribution.activeSubscriptionCount === 1 ? "" : "s"}.
              </p>
              {attribution.rows.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No active Commerce subscriptions yet — checkout or webhook sync will populate this
                  table.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/80">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Organisation</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Billing</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                        <th className="px-4 py-3 font-medium text-right">MRR equiv.</th>
                        <th className="px-4 py-3 font-medium text-right">ARR equiv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attribution.rows.map((row) => (
                        <tr
                          key={row.subscriptionId}
                          className="border-b border-slate-800/80 last:border-0"
                        >
                          <td className="px-4 py-3">
                            <Link
                              href={`/command/clients/${row.organisationId}`}
                              className="font-medium text-white hover:text-sky-400"
                            >
                              {row.organisationName}
                            </Link>
                            <p className="text-xs text-slate-500">{row.organisationSlug}</p>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {statusLabel(row.status)}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {billingLabel(row.interval)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-200">
                            {row.amountLabel}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                            {row.interval === "year"
                              ? (row.mrrEquivalentLabel ?? "—")
                              : row.interval === "month"
                                ? row.amountLabel
                                : "—"}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                            {row.arrEquivalentLabel ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-3 text-xs text-slate-500">{attribution.note}</p>
            </section>

            <section className="space-y-2 rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Related — not on this page</h2>
              <ul className="space-y-1 text-sm text-slate-400">
                <li>
                  Partner commission ledger:{" "}
                  <Link href="/command/commissions" className="text-sky-400 hover:underline">
                    Partners → Commissions
                  </Link>
                </li>
                <li>
                  Pipeline MRR Won:{" "}
                  <Link href="/command/growth-engine" className="text-sky-400 hover:underline">
                    Sales / Growth Engine
                  </Link>
                </li>
                <li>
                  Subscription ledger:{" "}
                  <Link
                    href="/command/commercial/subscriptions"
                    className="text-sky-400 hover:underline"
                  >
                    Commercial → Subscriptions
                  </Link>
                </li>
              </ul>
            </section>
          </>
        )}
      </main>
    </>
  );
}
