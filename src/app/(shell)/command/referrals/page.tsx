import { listAllReferrals, PARTNER_REFERRAL_STATUS_LABELS } from "@dg/platform-core";
import { PartnersAdminNav } from "@/components/command/PartnersAdminNav";

export default async function AdminReferralsPage() {
  const { referrals, total } = await listAllReferrals({ limit: 100 });

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="mt-1 text-sm text-slate-400">
          All partner referrals — {total} total
        </p>
      </header>

      <main className="dg-page-main">
        <div className="max-w-5xl space-y-6">
          <PartnersAdminNav active="referrals" />
          {referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
              No referrals yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Partner</th>
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
                        {r.website && <p className="text-xs text-slate-500">{r.website}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{r.partnerName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-300">
                        {r.contactName ?? "—"}
                        {r.email && <p className="text-xs text-slate-500">{r.email}</p>}
                      </td>
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
            </div>
          )}
        </div>
      </main>
    </>
  );
}
