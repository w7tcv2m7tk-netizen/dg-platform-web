import { listAllReferrals, PARTNER_REFERRAL_STATUS_LABELS } from "@dg/platform-core";

const CONVERTED = new Set(["ACCEPTED", "CUSTOMER", "ACTIVE", "ONBOARDING", "COMMISSIONING"]);

export default async function ConvertedReferralsPage() {
  const { referrals, total } = await listAllReferrals({ limit: 200 });
  const converted = referrals.filter((r) => CONVERTED.has(r.status));

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Converted Referrals</h1>
        <p className="mt-1 text-sm text-slate-400">{converted.length} converted of {total} total</p>
      </header>
      <main className="dg-page-main">
        <div className="max-w-5xl space-y-6">
          {converted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
              No converted referrals yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-700/40">
                  {converted.map((r) => (
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
          )}
        </div>
      </main>
    </>
  );
}
