"use client";

import { useMemo, useState } from "react";
import {
  APPROVED_PARTNER_MESSAGING,
  bpsToPercentLabel,
  illustratePartnerCommission,
  PARTNER_COMMISSION_CONFIG,
} from "@dg/platform-core";

function money(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

export function CommissionIllustrator() {
  const [monthlyReceived, setMonthlyReceived] = useState(500);
  const [perWeek, setPerWeek] = useState(2);
  const rate = PARTNER_COMMISSION_CONFIG.FOUNDING_RESELLER.commissionBps;

  const result = useMemo(
    () =>
      illustratePartnerCommission({
        monthlySubscriptionCents: monthlyReceived * 100,
        newCustomersPerWeek: perWeek,
        commissionBps: rate,
      }),
    [monthlyReceived, perWeek, rate],
  );

  const snapshotMonths = [1, 3, 6, 9, 12];

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6">
      <h3 className="text-base font-semibold text-white">Illustrative commission calculator</h3>
      <p className="mt-2 text-sm text-slate-400">
        {APPROVED_PARTNER_MESSAGING.body}
      </p>
      <p className="mt-2 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.example}</p>
      <p className="mt-2 text-sm text-slate-400">{APPROVED_PARTNER_MESSAGING.examplePaid}</p>
      <p className="mt-2 text-xs text-amber-200/80">{APPROVED_PARTNER_MESSAGING.disclaimer}</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-xs text-slate-400">
          Qualifying monthly revenue received (AUD)
          <input
            type="number"
            min={99}
            step={50}
            value={monthlyReceived}
            onChange={(e) => setMonthlyReceived(Number(e.target.value) || 0)}
            className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-400">
          New customers referred per week
          <input
            type="number"
            min={0}
            step={1}
            value={perWeek}
            onChange={(e) => setPerWeek(Number(e.target.value) || 0)}
            className="mt-1.5 w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-slate-300">
        Qualifying amount received: {money(monthlyReceived * 100)}/month. Commission{" "}
        {bpsToPercentLabel(rate)} ={" "}
        <span className="text-white">{money(result.commissionPerCustomerMonthCents)}</span>
        /month, or{" "}
        <span className="text-white">{money(result.commissionPerCustomerYearCents)}</span> over
        12 months.
      </p>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-700/60">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/60 text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2">Month</th>
              <th className="px-3 py-2">Customers</th>
              <th className="px-3 py-2">Monthly commission</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {result.snapshots
              .filter((s) => snapshotMonths.includes(s.month))
              .map((s) => (
                <tr key={s.month}>
                  <td className="px-3 py-2 text-slate-300">{s.month}</td>
                  <td className="px-3 py-2 text-white">{s.active}</td>
                  <td className="px-3 py-2 text-white">{money(s.monthlyCommissionCents)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg bg-slate-900/40 px-4 py-3">
          <dt className="text-xs text-slate-500">Year-one cash (cumulative)</dt>
          <dd className="mt-1 font-semibold text-white">{money(result.firstYearCashCents)}</dd>
        </div>
        <div className="rounded-lg bg-slate-900/40 px-4 py-3">
          <dt className="text-xs text-slate-500">End of year 1 annualised run-rate</dt>
          <dd className="mt-1 font-semibold text-white">{money(result.month12RunRateCents)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-slate-500">
        Assumes 4 weeks per month, customers stay active, commission is on qualifying fees actually
        received (not catalogue list alone), and DigitalGate closes every introduction. Not a
        guarantee.
      </p>
    </div>
  );
}
