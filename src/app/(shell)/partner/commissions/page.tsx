import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  getPartnerByClerkUserId,
  getPartnerCommissionSummary,
  listPartnerCommissions,
} from "@dg/platform-core";

function centsToDisplay(cents: number, currency = "AUD"): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

const STATUS_LABEL: Record<string, string> = {
  CALCULATED: "Calculated",
  PENDING: "Pending",
  APPROVED: "Approved",
  PAID: "Paid",
};

const STATUS_COLOR: Record<string, string> = {
  CALCULATED: "bg-slate-700 text-slate-300",
  PENDING: "bg-amber-900/40 text-amber-300",
  APPROVED: "bg-sky-900/40 text-sky-300",
  PAID: "bg-emerald-900/40 text-emerald-300",
};

export default async function PartnerCommissionsPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner) redirect("/partner");

  const [commissions, summary] = await Promise.all([
    listPartnerCommissions(partner.id),
    getPartnerCommissionSummary(partner.id),
  ]);

  return (
    <div className="max-w-4xl space-y-8">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
          <p className="text-xs font-medium text-slate-400">Total Earned</p>
          <p className="mt-1 text-2xl font-bold text-white">
            {centsToDisplay(summary.totalEarnedCents)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
          <p className="text-xs font-medium text-slate-400">Pending / Approved</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">
            {centsToDisplay(summary.pendingCents)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
          <p className="text-xs font-medium text-slate-400">Paid</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">
            {centsToDisplay(summary.paidCents)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-white">Commission History</h2>

        {commissions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No commission entries yet. Commission accrues when referred customers make qualifying
            payments.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Qualifying Revenue</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/20">
                    <td className="px-4 py-3 font-medium text-white">
                      {c.businessName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {c.periodStart && c.periodEnd
                        ? `${new Date(c.periodStart).toLocaleDateString("en-AU")} – ${new Date(c.periodEnd).toLocaleDateString("en-AU")}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {centsToDisplay(c.qualifyingRevenueCents, c.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{c.commissionPercent}%</td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {centsToDisplay(c.commissionAmountCents, c.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[c.status] ?? "bg-slate-700 text-slate-300"}`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-700/40 bg-slate-800/30 px-5 py-4 text-xs text-slate-400 space-y-2">
        <p>
          Commission is calculated on qualifying Platform + App subscription fees actually paid —
          not list price, and not Professional Services. Refunds, failed payments, credits, and
          customers already known to DigitalGate do not qualify. Your {partner.partnerTypeLabel}{" "}
          rate is {partner.commissionPercent}% for the first {partner.commissionDurationMonths}{" "}
          months of each referred customer.
        </p>
        <p>
          The customer&apos;s Founding discount (if any) is a separate benefit and is never combined
          with partner commission. See Resources for the full qualifying-fees definition.
        </p>
        <p>
          Payments are issued manually by DigitalGate. Contact{" "}
          <a href="mailto:hello@digitalgate.com.au" className="text-sky-400 hover:underline">
            hello@digitalgate.com.au
          </a>{" "}
          with questions.
        </p>
      </div>
    </div>
  );
}
