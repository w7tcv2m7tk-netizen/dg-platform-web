import { listOperatorPaidCommissions } from "@dg/platform-core";

import { requirePlatformOperatorContext } from "@/lib/platform-operator";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}

export default async function PartnerPayoutsPage() {
  const operator = await requirePlatformOperatorContext();
  let paid: Awaited<ReturnType<typeof listOperatorPaidCommissions>>["commissions"] = [];
  let total = 0;
  try {
    const listed = await listOperatorPaidCommissions(operator, { limit: 100 });
    paid = listed.commissions;
    total = listed.total;
  } catch {
    /* tables not migrated yet */
  }

  const paidCents = paid.reduce((sum, c) => sum + c.commissionAmountCents, 0);

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Payouts</h1>
        <p className="mt-1 text-sm text-slate-400">
          Paid commission history. Bank transfer / Stripe Connect payout execution is still
          recorded here when a commission is marked paid — not a separate payment rail yet.
        </p>
      </header>

      <main className="dg-page-main">
        <div className="max-w-5xl space-y-6">
          <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
            <p className="text-xs text-slate-400">Paid to date</p>
            <p className="mt-1 text-2xl font-bold text-white">{centsToDisplay(paidCents)}</p>
            <p className="mt-1 text-xs text-slate-500">{total} paid entries</p>
          </div>

          {paid.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
              No payouts yet. Approve commissions first, then mark them paid to record a payout.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Acquisition Partner</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {paid.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3 text-white">{c.partnerName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">{c.businessName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.periodStart
                          ? new Date(c.periodStart).toLocaleDateString("en-AU")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {centsToDisplay(c.commissionAmountCents)}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.paidAt ? new Date(c.paidAt).toLocaleDateString("en-AU") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
