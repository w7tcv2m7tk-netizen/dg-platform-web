import Link from "next/link";
import { getOperatorCommandMrrAttribution } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

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

export default async function CommercialSubscriptionsPage() {
  const operator = await requirePlatformOperatorContext();
  const attribution = process.env.DATABASE_URL
    ? await getOperatorCommandMrrAttribution(operator)
    : null;

  return (
    <>
      <header className="dg-page-header">
        <OperatorCategoryHeader
          eyebrow="Commercial"
          title="Subscriptions"
          question="Commerce subscription ledger — trial and active states, billing frequency and period end."
          backHref="/command/revenue"
          backLabel="Revenue / MRR"
        />
      </header>
      <main className="dg-page-main space-y-6">
        {!attribution ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — subscriptions unavailable.
          </div>
        ) : (
          <>
            <OperatorMetricStrip
              metrics={[
                {
                  label: "Monthly MRR",
                  value: attribution.monthlyMrrLabel,
                  tone: "sky",
                },
                {
                  label: "ARR",
                  value: attribution.arrLabel,
                },
                {
                  label: "Active / trial",
                  value: attribution.activeSubscriptionCount,
                },
                {
                  label: "Trials",
                  value: attribution.trialCount,
                },
                {
                  label: "Annual",
                  value: attribution.annualCount,
                },
              ]}
              columnsClassName="sm:grid-cols-2 lg:grid-cols-5"
            />
            <p className="text-xs text-slate-500">{attribution.note}</p>
            {attribution.rows.length === 0 ? (
              <p className="text-sm text-slate-500">
                No active or trial Commerce subscriptions yet — checkout or webhook sync will
                populate this ledger.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Billing</th>
                      <th className="px-4 py-3 font-medium">Period end</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">MRR equiv.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {attribution.rows.map((row) => (
                      <tr key={row.subscriptionId} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3">
                          <Link
                            href={`/command/clients/${row.organisationId}`}
                            className="font-medium text-white hover:text-sky-300"
                          >
                            {row.organisationName}
                          </Link>
                          <p className="text-xs text-slate-500">{row.organisationSlug}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {statusLabel(row.status)}
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {billingLabel(row.interval)}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {row.currentPeriodEnd
                            ? new Date(row.currentPeriodEnd).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-400">{row.providerId || "—"}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                          {row.amountLabel}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                          {row.interval === "year"
                            ? (row.mrrEquivalentLabel ?? "—")
                            : row.interval === "month"
                              ? row.amountLabel
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-sm text-slate-500">
              Revenue hub:{" "}
              <Link href="/command/revenue" className="text-sky-400 hover:underline">
                Revenue / MRR
              </Link>
            </p>
          </>
        )}
      </main>
    </>
  );
}
