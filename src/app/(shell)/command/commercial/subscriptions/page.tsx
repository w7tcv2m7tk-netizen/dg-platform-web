import Link from "next/link";
import { redirect } from "next/navigation";
import { getCommandMrrAttribution } from "@dg/platform-core";

import { OperatorCategoryHeader } from "@/components/command/OperatorCategoryHeader";
import { OperatorMetricStrip } from "@/components/command/OperatorMetricStrip";
import { getPlatformPageContext } from "@/lib/platform-page-context";

export default async function CommercialSubscriptionsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const attribution = process.env.DATABASE_URL
    ? await getCommandMrrAttribution()
    : null;

  return (
    <div className="space-y-6">
      <OperatorCategoryHeader
        eyebrow="Commercial"
        title="Subscriptions"
        question="Active and trialing Commerce subscriptions attributed to organisations."
      />

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
                label: "Active / trialing",
                value: attribution.activeSubscriptionCount,
              },
            ]}
          />
          <p className="text-xs text-slate-500">{attribution.note}</p>
          {attribution.rows.length === 0 ? (
            <p className="text-sm text-slate-500">
              No active Commerce subscriptions yet — checkout or webhook sync will populate this
              table.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-700/80">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Organisation</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Interval</th>
                    <th className="px-4 py-3 font-medium">Period end</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
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
                      <td className="px-4 py-3 text-slate-300">{row.status}</td>
                      <td className="px-4 py-3 text-slate-300">{row.interval}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {row.currentPeriodEnd
                          ? new Date(row.currentPeriodEnd).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-white">
                        {row.amountLabel}
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
            {" · "}
            <Link
              href="/command/opportunities/expansion"
              className="text-sky-400 hover:underline"
            >
              Expansion
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
