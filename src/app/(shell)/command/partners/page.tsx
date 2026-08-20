import Link from "next/link";
import {
  countPartnerSeats,
  listAllCommissions,
  listAllReferrals,
  listPartners,
  PARTNER_COMMISSION_CONFIG,
} from "@dg/platform-core";
import { PartnersAdminNav } from "@/components/command/PartnersAdminNav";
import { InviteFoundingResellerForm } from "@/components/founding/InviteFoundingResellerForm";

function centsToDisplay(cents: number): string {
  return (cents / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  });
}

const CUSTOMER_STATUSES = new Set(["CUSTOMER", "ACTIVE", "ACCEPTED", "COMMISSIONING"]);

export default async function PartnerProgrammeDashboardPage() {
  let partners: Awaited<ReturnType<typeof listPartners>>["partners"] = [];
  let total = 0;
  let seats = (Object.keys(PARTNER_COMMISSION_CONFIG) as Array<
    keyof typeof PARTNER_COMMISSION_CONFIG
  >).reduce(
    (acc, type) => {
      const cap = PARTNER_COMMISSION_CONFIG[type].seatCap;
      acc[type] = { used: 0, cap, remaining: cap };
      return acc;
    },
    {} as Awaited<ReturnType<typeof countPartnerSeats>>,
  );
  let referralTotal = 0;
  let customerCount = 0;
  let pendingCents = 0;
  let paidCents = 0;

  try {
    const [listed, counted, referrals, commissions] = await Promise.all([
      listPartners({ limit: 100 }),
      countPartnerSeats(),
      listAllReferrals({ limit: 200 }),
      listAllCommissions({ limit: 200 }),
    ]);
    partners = listed.partners;
    total = listed.total;
    seats = counted;
    referralTotal = referrals.total;
    customerCount = referrals.referrals.filter((r) => CUSTOMER_STATUSES.has(r.status)).length;
    pendingCents = commissions.commissions
      .filter((c) => ["CALCULATED", "PENDING", "APPROVED"].includes(c.status))
      .reduce((sum, c) => sum + c.commissionAmountCents, 0);
    paidCents = commissions.commissions
      .filter((c) => c.status === "PAID")
      .reduce((sum, c) => sum + c.commissionAmountCents, 0);
  } catch {
    /* tables not migrated yet */
  }

  const active = partners.filter((p) => p.status === "active").length;
  const pending = partners.filter((p) => p.status === "pending").length;
  const reseller = seats.FOUNDING_RESELLER;

  const ranking = partners.slice(0, 12);

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">Partners</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Reseller programme</h1>
        <p className="mt-1 text-sm text-slate-400">
          Channel performance for DigitalGate introducers — not DigitalGate’s own Prospecting
          pipeline. Founding Reseller seats {reseller.used} of {reseller.cap}.
        </p>
      </header>

      <main className="dg-page-main">
        <div className="max-w-5xl space-y-6">
          <PartnersAdminNav active="dashboard" />
          <InviteFoundingResellerForm />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-sky-700/30 bg-sky-900/10 px-5 py-4">
              <p className="text-sm font-medium text-white">Monday partner briefing</p>
              <p className="mt-1 text-sm text-slate-400">
                Full Founding Reseller meeting run-sheet — agenda, discussion prompts and outcomes.
              </p>
              <Link
                href="/command/partners/briefing"
                className="mt-3 inline-block text-sm font-medium text-sky-400 hover:underline"
              >
                Open briefing →
              </Link>
            </div>
            <div className="rounded-xl border border-violet-700/30 bg-violet-900/10 px-5 py-4">
              <p className="text-sm font-medium text-white">Partner Ecosystem</p>
              <p className="mt-1 text-sm text-slate-400">
                Implementation Partners next — onboarding is not a reseller job.
              </p>
              <Link
                href="/command/partners/ecosystem"
                className="mt-3 inline-block text-sm font-medium text-violet-300 hover:underline"
              >
                Open ecosystem →
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Active resellers", value: String(active) },
              { label: "Pending applications", value: String(pending) },
              { label: "Referrals", value: String(referralTotal) },
              { label: "Customers referred", value: String(customerCount) },
              { label: "Commission owing", value: centsToDisplay(pendingCents) },
              { label: "Commission paid", value: centsToDisplay(paidCents) },
              {
                label: "Founding Reseller seats",
                value: `${seats.FOUNDING_RESELLER.used} / ${seats.FOUNDING_RESELLER.cap}`,
              },
              {
                label: "Partners on file",
                value: String(total),
              },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-slate-700/60 bg-slate-800/40 px-4 py-3"
              >
                <p className="text-xs text-slate-400">{card.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{card.value}</p>
              </div>
            ))}
          </div>

          <section className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40">
            <div className="flex items-center justify-between border-b border-slate-700/60 px-4 py-3">
              <h2 className="text-sm font-semibold text-white">Resellers</h2>
              <Link
                href="/command/partners/resellers"
                className="text-xs text-sky-400 hover:underline"
              >
                All resellers →
              </Link>
            </div>
            {ranking.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                No partners registered yet. Founding Reseller is invitation only.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Reseller</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/40">
                  {ranking.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <Link href={`/command/partners/${p.id}`} className="font-medium text-white hover:text-sky-300">
                          {p.displayName ?? p.businessName ?? "—"}
                        </Link>
                        {p.email ? <p className="text-xs text-slate-500">{p.email}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{p.partnerTypeLabel}</td>
                      <td className="px-4 py-3 capitalize text-slate-300">{p.status}</td>
                      <td className="px-4 py-3 text-slate-400">
                        {p.joinedAt ? new Date(p.joinedAt).toLocaleDateString("en-AU") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
