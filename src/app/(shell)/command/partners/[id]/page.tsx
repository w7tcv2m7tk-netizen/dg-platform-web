import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getPartnerById,
  listPartnerReferrals,
  listPartnerCommissions,
  getPartnerCommissionSummary,
  PARTNER_REFERRAL_STATUS_LABELS,
} from "@dg/platform-core";
import { PartnerAdminActions } from "@/components/partner/PartnerAdminActions";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 2,
  });
}

const COMMISSION_STATUS_COLOR: Record<string, string> = {
  CALCULATED: "bg-slate-700 text-slate-300",
  PENDING: "bg-amber-900/40 text-amber-300",
  APPROVED: "bg-sky-900/40 text-sky-300",
  PAID: "bg-emerald-900/40 text-emerald-300",
};

export default async function AdminPartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [partner, referrals, commissions, commissionSummary] = await Promise.all([
    getPartnerById(id),
    listPartnerReferrals(id),
    listPartnerCommissions(id),
    getPartnerCommissionSummary(id),
  ]);

  if (!partner) notFound();

  return (
    <>
      <header className="dg-page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/command/partners/resellers" className="text-xs text-slate-500 hover:text-slate-300">
              ← Resellers
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-white">
              {partner.displayName ?? "Partner"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {partner.partnerTypeLabel} &middot; {partner.commissionPercent}% ×{" "}
              {partner.commissionDurationMonths} months
            </p>
          </div>
          <PartnerAdminActions partnerId={partner.id} currentStatus={partner.status} />
        </div>
      </header>

      <main className="dg-page-main">
        <div className="max-w-4xl space-y-10">
          {/* Profile */}
          <Section title="Profile">
            <dl className="divide-y divide-slate-700/40">
              {[
                ["Name", partner.displayName ?? "—"],
                ["Business", partner.businessName ?? "—"],
                ["Email", partner.email ?? "—"],
                ["Phone", partner.phone ?? "—"],
                ["Referral Code", partner.referralCode],
                ["Referral URL", partner.referralUrl],
                ["Status", partner.status],
                ["Tier", partner.partnerTypeLabel],
                ["Commission", `${partner.commissionPercent}% for ${partner.commissionDurationMonths} months`],
                ["Cohort", partner.cohort ?? "—"],
                ["Joined", partner.joinedAt ? new Date(partner.joinedAt).toLocaleDateString("en-AU") : "Pending"],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4 px-5 py-3 text-sm">
                  <span className="w-36 shrink-0 text-slate-400">{label}</span>
                  <span className="text-white break-all">{value}</span>
                </div>
              ))}
            </dl>
            {partner.notes && (
              <div className="border-t border-slate-700/40 px-5 py-3 text-sm text-slate-300">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                {partner.notes}
              </div>
            )}
          </Section>

          {/* Commission summary */}
          <Section title="Commission Summary">
            <div className="grid grid-cols-3 divide-x divide-slate-700/40">
              <SummaryCell label="Total Earned" value={centsToDisplay(commissionSummary.totalEarnedCents)} />
              <SummaryCell label="Pending" value={centsToDisplay(commissionSummary.pendingCents)} />
              <SummaryCell label="Paid" value={centsToDisplay(commissionSummary.paidCents)} />
            </div>
          </Section>

          {/* Referrals */}
          <Section title={`Referrals (${referrals.length})`}>
            {referrals.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">No referrals yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Referred</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {referrals.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-700/10">
                      <td className="px-4 py-3 font-medium text-white">{r.businessName}</td>
                      <td className="px-4 py-3 text-slate-300">{r.contactName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize">
                        {r.source === "warm_introduction" ? "Warm intro" : "Link"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {PARTNER_REFERRAL_STATUS_LABELS[r.status] ?? r.status}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {new Date(r.referredAt).toLocaleDateString("en-AU")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          {/* Commissions */}
          <Section title={`Commissions (${commissions.length})`}>
            {commissions.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-400">No commission entries yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-700/10">
                      <td className="px-4 py-3 font-medium text-white">{c.businessName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {c.periodStart
                          ? new Date(c.periodStart).toLocaleDateString("en-AU")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {centsToDisplay(c.qualifyingRevenueCents)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {centsToDisplay(c.commissionAmountCents)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COMMISSION_STATUS_COLOR[c.status] ?? "bg-slate-700 text-slate-300"}`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>
      </main>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
      <div className="border-b border-slate-700/60 px-5 py-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-white">{value}</p>
    </div>
  );
}
