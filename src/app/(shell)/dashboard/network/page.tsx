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
          Business-to-business introductions and discovery — Phase 5 foundations
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
            <h2 className="font-semibold text-white">Marketplace</h2>
            <p className="mt-2 text-sm text-slate-400">
              Browse Software, Services, Professionals, Partners, and Integrations.
            </p>
            <Link
              href="/dashboard/marketplace"
              className="mt-4 inline-block text-sm text-blue-400 hover:underline"
            >
              Browse marketplace →
            </Link>
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Reputation (Core)</h2>
            <p className="mt-2 text-sm text-slate-400">
              Core capability — unified review feed via Connectors, timeline requests, Reputation
              Score™ when real data exists. Network Refer &amp; Earn stays separate.
            </p>
            <Link
              href="/apps/reviews"
              className="mt-4 inline-block text-sm text-sky-400 hover:underline"
            >
              Open Reputation →
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
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Separation</p>
          <p className="mt-2 text-sm text-slate-300">
            Platform Refer &amp; Earn (customers refer DigitalGate subscriptions) lives in{" "}
            <Link href="/dashboard/settings/referrals" className="text-blue-400 hover:underline">
              Settings → Refer &amp; Earn
            </Link>
            . This Network surface is B2B introductions only.
          </p>
        </div>
      </main>
    </>
  );
}
