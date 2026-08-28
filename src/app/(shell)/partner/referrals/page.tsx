import { redirect } from "next/navigation";

import { getPlatformPageContext } from "@/lib/platform-page-context";
import { getPartnerByClerkUserId, listPartnerReferrals, PARTNER_REFERRAL_STATUS_LABELS } from "@dg/platform-core";
import { ReferBusinessPanel } from "@/components/partner/ReferBusinessPanel";

const STATUS_COLOR: Record<string, string> = {
  INVITED: "bg-slate-700 text-slate-300",
  REFERRED: "bg-sky-900/50 text-sky-300",
  CONTACTED: "bg-sky-800/50 text-sky-200",
  CONSULTATION: "bg-violet-900/50 text-violet-300",
  ACCEPTED: "bg-emerald-900/50 text-emerald-300",
  ONBOARDING: "bg-emerald-800/50 text-emerald-200",
  ACTIVE: "bg-green-900/60 text-green-300",
  COMMISSIONING: "bg-green-900/60 text-green-200",
  CLOSED: "bg-slate-800 text-slate-500",
  DECLINED: "bg-red-900/30 text-red-400",
};

export default async function PartnerReferralsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { clerkUserId } = await getPlatformPageContext();
  if (!clerkUserId) redirect("/login");

  const partner = await getPartnerByClerkUserId(clerkUserId);
  if (!partner) redirect("/partner");

  const { action } = await searchParams;
  const showNew = action === "new";

  const referrals = await listPartnerReferrals(partner.id);

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Your Referrals</h2>
        <a
          href="/partner/referrals?action=new"
          className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          + Refer a Business
        </a>
      </div>

      {showNew && (
        <ReferBusinessPanel
          partnerId={partner.id}
          referralCode={partner.referralCode}
          referralUrl={partner.referralUrl}
        />
      )}

      {referrals.length === 0 && !showNew ? (
        <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center">
          <p className="text-sm font-medium text-slate-300">No referrals yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Introduce a business via your referral link or submit a warm introduction.
          </p>
          <a
            href="/partner/referrals?action=new"
            className="mt-4 inline-block text-sm text-sky-400 hover:underline"
          >
            + Refer your first business
          </a>
        </div>
      ) : referrals.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
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
                <tr key={r.id} className="hover:bg-slate-700/20">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{r.businessName}</p>
                    {r.website && (
                      <p className="text-xs text-slate-500">{r.website}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.contactName ?? "—"}
                    {r.email && (
                      <p className="text-xs text-slate-500">{r.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400 capitalize">
                    {r.source === "warm_introduction" ? "Warm introduction" : "Referral link"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status] ?? "bg-slate-700 text-slate-300"}`}
                    >
                      {PARTNER_REFERRAL_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.referredAt).toLocaleDateString("en-AU")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
