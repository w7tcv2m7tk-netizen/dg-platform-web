import Link from "next/link";
import {
  BUSINESS_REFERRAL_COMPLIANCE_NOTE,
  businessReferralFunnelCounts,
  listOrganisationBusinessReferrals,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

export default async function NetworkHomePage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;
  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  const referrals = session
    ? await listOrganisationBusinessReferrals(session.organisationId)
    : [];
  const funnel = businessReferralFunnelCounts(referrals);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Network</h1>
        <p className="text-sm text-slate-400">
          Business-to-business introductions and your DigitalGate ecosystem — resellers, referrals,
          commissions, and Refer &amp; Earn.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="dg-card">
            <h2 className="font-semibold text-white">Business Referral Network</h2>
            <p className="mt-2 text-sm text-slate-400">
              Verified businesses refer each other. Types: Free · Reciprocal · Paid · Commission
              (disclosed). Contact = person.
            </p>
            <Link
              href="/dashboard/network/referrals"
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              Open referrals →
            </Link>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Refer &amp; Earn</h2>
            <p className="mt-2 text-sm text-slate-400">
              Refer DigitalGate subscriptions — earn platform credit or cash (Customer 20% · Partner
              25% · Reseller 30%).
            </p>
            <Link
              href="/dashboard/network/refer-earn"
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              Open Refer &amp; Earn →
            </Link>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Ecosystem</h2>
            <p className="mt-2 text-sm text-slate-400">
              Partners, resellers, commissions, and the broader DigitalGate network layer.
            </p>
            <Link
              href="/dashboard/network/ecosystem"
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              View ecosystem →
            </Link>
          </div>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Referral funnel (org)</h2>
          <p className="mt-1 text-xs text-slate-500">
            Referral → Accepted → Contacted → Converted → Revenue
          </p>
          {!session ? (
            <p className="mt-3 text-sm text-slate-400">Sign in to load funnel counts.</p>
          ) : (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ["referral", funnel.referral],
                  ["accepted", funnel.accepted],
                  ["contacted", funnel.contacted],
                  ["converted", funnel.converted],
                  ["revenue", funnel.revenue],
                ] as const
              ).map(([label, count]) => (
                <div key={label} className="rounded-lg border border-slate-800 px-3 py-2">
                  <dt className="text-xs capitalize text-slate-500">{label}</dt>
                  <dd className="text-xl font-semibold text-white">{count}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">Compliance</p>
          <p className="mt-1 text-xs text-amber-100/80">{BUSINESS_REFERRAL_COMPLIANCE_NOTE}</p>
        </div>

        <div className="dg-card border-dashed">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Discover</p>
          <p className="mt-2 text-sm text-slate-300">
            Marketplace is for discovering capabilities —{" "}
            <Link href="/dashboard/marketplace" className="text-blue-400 hover:underline">
              browse Marketplace
            </Link>
            . Apps is for what is installed on this organisation —{" "}
            <Link href="/dashboard/apps" className="text-blue-400 hover:underline">
              manage Apps
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  );
}
