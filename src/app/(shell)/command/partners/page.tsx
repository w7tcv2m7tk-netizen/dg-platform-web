import Link from "next/link";
import { listPartners } from "@dg/platform-core";

const TIER_LABEL: Record<string, string> = {
  FOUNDING_RESELLER: "Founding Reseller",
  FOUNDING_PARTNER: "Founding Partner",
  FOUNDING_CUSTOMER: "Founding Customer",
  CUSTOMER_REFERRER: "Customer Referrer",
};

const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-900/40 text-emerald-300",
  pending: "bg-amber-900/40 text-amber-300",
  suspended: "bg-red-900/30 text-red-400",
  inactive: "bg-slate-700 text-slate-500",
};

export default async function AdminPartnersPage() {
  const { partners, total } = await listPartners();

  return (
    <>
      <header className="dg-page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Partners</h1>
            <p className="mt-1 text-sm text-slate-400">
              DigitalGate Partner Programme — {total} partner{total !== 1 ? "s" : ""}
            </p>
          </div>
          <Link
            href="/command/partners/new"
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
          >
            + New Partner
          </Link>
        </div>
      </header>

      <main className="dg-page-main">
        <div className="max-w-5xl">
          {partners.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center text-sm text-slate-400">
              No partners registered yet.{" "}
              <Link href="/command/partners/new" className="text-sky-400 hover:underline">
                Create the first partner →
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{p.displayName ?? "—"}</p>
                        {p.businessName && (
                          <p className="text-xs text-slate-500">{p.businessName}</p>
                        )}
                        {p.email && (
                          <p className="text-xs text-slate-500">{p.email}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {TIER_LABEL[p.partnerType] ?? p.partnerType}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {p.commissionPercent}% × {p.commissionDurationMonths}mo
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400">
                        {p.referralCode}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLOR[p.status] ?? "bg-slate-700 text-slate-400"}`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.joinedAt
                          ? new Date(p.joinedAt).toLocaleDateString("en-AU")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/command/partners/${p.id}`}
                          className="text-sky-400 hover:underline text-xs"
                        >
                          View →
                        </Link>
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
