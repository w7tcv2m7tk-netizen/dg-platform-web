import Link from "next/link";
import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import {
  getPartnerByClerkUserId,
  getPartnerDashboardMetrics,
  listPartnerReferrals,
  PARTNER_COMMISSION_CONFIG,
  PARTNER_REFERRAL_STATUS_LABELS,
  bpsToPercent,
  COMMISSION_PERIOD_MONTHS,
} from "@dg/platform-core";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

const STATUS_COLOR: Record<string, string> = {
  INVITED: "text-slate-400",
  REFERRED: "text-sky-400",
  CONTACTED: "text-sky-300",
  CONSULTATION: "text-violet-400",
  ACCEPTED: "text-emerald-400",
  ONBOARDING: "text-emerald-300",
  ACTIVE: "text-emerald-400 font-semibold",
  COMMISSIONING: "text-green-400 font-semibold",
  CLOSED: "text-slate-500",
  DECLINED: "text-red-400",
};

export default async function PartnerDashboardPage() {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner) redirect("/partner");

  const [metrics, referrals] = await Promise.all([
    getPartnerDashboardMetrics(partner.id),
    listPartnerReferrals(partner.id),
  ]);

  const recentReferrals = referrals.slice(0, 10);
  const config = PARTNER_COMMISSION_CONFIG[partner.partnerType];
  const commissionLabel =
    config.overrideCommissionBps != null && config.commissionBps > 0
      ? `${bpsToPercent(config.commissionBps)}% own + ${bpsToPercent(config.overrideCommissionBps)}% override`
      : config.serviceCommissionBps && !config.platformSubscriptionCommission
        ? `${bpsToPercent(config.serviceCommissionBps)}% service revenue`
        : `${bpsToPercent(config.commissionBps)}%`;

  return (
    <div className="max-w-4xl space-y-8">
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 px-5 py-4">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-300">
          Your programme
        </p>
        <p className="mt-1 text-lg font-semibold text-white">{config.label}</p>
        <p className="mt-1 text-sm text-slate-300">
          {config.programme} · {commissionLabel} · first {COMMISSION_PERIOD_MONTHS} months of
          qualifying revenue actually collected
        </p>
      </div>
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <MetricCard label="Businesses Referred" value={metrics.businessesReferred.toString()} />
        <MetricCard label="Consultations" value={metrics.consultations.toString()} />
        <MetricCard label="Active Customers" value={metrics.activeCustomers.toString()} />
        <MetricCard
          label="Commission Earned"
          value={centsToDisplay(metrics.commissionEarnedCents)}
        />
        <MetricCard
          label="Pending Commission"
          value={centsToDisplay(metrics.commissionPendingCents)}
        />
        <MetricCard
          label="Commission Paid"
          value={centsToDisplay(metrics.commissionPaidCents)}
        />
      </div>

      {/* Quick action */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/partner/referrals?action=new"
          className="rounded-full bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
        >
          + Refer a Business
        </Link>
        <Link
          href="/partner/playbook"
          className="rounded-full border border-sky-600/50 bg-sky-900/20 px-5 py-2.5 text-sm font-medium text-sky-200 hover:border-sky-400 hover:text-white"
        >
          Read playbook
        </Link>
        <Link
          href="/partner/demo"
          className="rounded-full border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-300 hover:border-sky-400 hover:text-white"
        >
          Open Demo
        </Link>
        <Link
          href="/partner/profile"
          className="rounded-full border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-300 hover:border-sky-400 hover:text-white"
        >
          Copy referral link
        </Link>
      </div>

      {/* Referral pipeline */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-white">Referral Pipeline</h2>
        {recentReferrals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No referrals yet.{" "}
            <Link href="/partner/referrals?action=new" className="text-sky-400 hover:underline">
              Refer your first business →
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Referred</th>
                  <th className="px-4 py-3">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40">
                {recentReferrals.map((r) => {
                  const lastActivity =
                    r.convertedAt ?? r.acceptedAt ?? r.consultationAt ?? r.contactedAt ?? r.referredAt;
                  return (
                    <tr key={r.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3 font-medium text-white">{r.businessName}</td>
                      <td className={`px-4 py-3 ${STATUS_COLOR[r.status] ?? "text-slate-400"}`}>
                        {PARTNER_REFERRAL_STATUS_LABELS[r.status] ?? r.status}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(r.referredAt).toLocaleDateString("en-AU")}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(lastActivity).toLocaleDateString("en-AU")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {referrals.length > 10 && (
              <div className="border-t border-slate-700/60 px-4 py-3 text-sm">
                <Link href="/partner/referrals" className="text-sky-400 hover:underline">
                  View all {referrals.length} referrals →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-5 py-4">
      <p className="text-xs font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
