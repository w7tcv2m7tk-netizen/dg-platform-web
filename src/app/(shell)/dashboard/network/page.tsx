import Link from "next/link";
import {
  BUSINESS_REFERRAL_COMPLIANCE_NOTE,
  businessReferralFunnelCounts,
  listOrganisationBusinessReferrals,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";
import { requireStaffNetwork } from "@/lib/network-staff-gate";

export default async function NetworkHomePage() {
  const { staff } = await requireStaffNetwork();

  if (staff) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Network</h1>
          <p className="mt-2 max-w-2xl text-base text-slate-200">
            Commercial network transactions — referrals, commissions and payouts.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Partners are people and organisations (DigitalGate → Partners). Network is the
            infrastructure between them. Do not manage partner relationships here.
          </p>
        </header>
        <main className="dg-page-main space-y-4">
          {(
            [
              {
                href: "/command/referrals",
                title: "Referrals",
                body: "What referral activity is flowing through the network?",
              },
              {
                href: "/command/commissions",
                title: "Commissions",
                body: "What financial obligations has the network generated?",
              },
              {
                href: "/command/partners/payouts",
                title: "Payouts",
                body: "Payment runs and history for network obligations.",
              },
              {
                href: "/command/partners",
                title: "Partners",
                body: "Relationship management — roster, status, certification.",
              },
            ] as const
          ).map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4 transition-colors hover:border-sky-500/40"
            >
              <h2 className="font-semibold text-white">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-400">{card.body}</p>
            </Link>
          ))}
        </main>
      </>
    );
  }

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

  const sent = funnel.referral;
  const received = 0; // inbound tracking expands with Network depth
  const accepted = funnel.accepted;
  const converted = funnel.converted;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Network</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Build relationships. Generate referrals. Grow through trusted connections.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-5">
          <h2 className="text-lg font-semibold text-white">Business Referral Network</h2>
          <p className="mt-2 text-sm text-slate-400">
            Find and refer trusted businesses — business-to-business introductions, not DigitalGate
            subscription referrals.
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Sent", sent],
                ["Received", received],
                ["Accepted", accepted],
                ["Converted", converted],
              ] as const
            ).map(([label, count]) => (
              <div key={label} className="rounded-lg border border-slate-800 px-3 py-3">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{count}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/dashboard/network/referrals"
            className="mt-5 inline-flex text-sm font-medium text-sky-400 hover:underline"
          >
            View Referrals →
          </Link>
        </section>

        <section className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-5 py-5">
          <h2 className="text-lg font-semibold text-white">Refer &amp; Earn</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">
            Refer a business to DigitalGate and earn 20% platform credit or cash, subject to
            programme terms. Founding referral ladder 20% / 15% / 10% · Acquisition Partner 25%.
          </p>
          <Link
            href="/dashboard/network/refer-earn"
            className="mt-5 inline-flex text-sm font-medium text-sky-400 hover:underline"
          >
            Refer a Business →
          </Link>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-5">
          <h2 className="text-lg font-semibold text-white">My Connections</h2>
          <p className="mt-2 text-sm text-slate-400">
            Businesses and partners you&apos;ve connected with.
          </p>
          <Link
            href="/dashboard/network/connections"
            className="mt-5 inline-flex text-sm font-medium text-sky-400 hover:underline"
          >
            View Connections →
          </Link>
        </section>

        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200">Compliance</p>
          <p className="mt-1 text-xs text-amber-100/80">{BUSINESS_REFERRAL_COMPLIANCE_NOTE}</p>
        </div>
      </main>
    </>
  );
}
