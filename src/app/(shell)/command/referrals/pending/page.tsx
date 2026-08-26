import { listAllReferrals, PARTNER_REFERRAL_STATUS_LABELS } from "@dg/platform-core";

const CONVERTED = new Set(["ACCEPTED", "CUSTOMER", "ACTIVE", "ONBOARDING", "COMMISSIONING"]);

export default async function PendingReferralsPage() {
  const { referrals, total } = await listAllReferrals({ limit: 200 });
  const pending = referrals.filter((r) => !CONVERTED.has(r.status) && r.status !== "DECLINED" && r.status !== "CANCELLED" && r.status !== "CLOSED");

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Pending Referrals</h1>
        <p className="mt-1 text-sm text-slate-400">{pending.length} pending of {total} total</p>
      </header>
      <main className="dg-page-main">
        <div className="max-w-5xl space-y-6">
          <ReferralTable referrals={pending} />
        </div>
      </main>
    </>
  );
}

function ReferralTable({
  referrals,
}: {
  referrals: Awaited<ReturnType<typeof listAllReferrals>>["referrals"];
}) {
  if (referrals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
        No referrals in this view.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-slate-700/40">
          {referrals.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-3 font-medium text-white">{r.businessName}</td>
              <td className="px-4 py-3 text-slate-300">
                {PARTNER_REFERRAL_STATUS_LABELS[r.status] ?? r.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
