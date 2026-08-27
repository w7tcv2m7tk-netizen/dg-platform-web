import Link from "next/link";
import {
  BUSINESS_REFERRAL_COMPLIANCE_NOTE,
  BUSINESS_REFERRAL_STATUS_LABELS,
  BUSINESS_REFERRAL_TYPE_LABELS,
  listOrganisationBusinessReferrals,
  type BusinessReferralStatus,
  type BusinessReferralType,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { PlatformHubPage, requireStaffNetwork } from "@/lib/network-staff-gate";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { fetchPortalMe } from "@/lib/dg-api";

/**
 * Customer Network → Referrals = B2B business referrals.
 * Staff Network → Referrals = commercial network transaction hub (partner SaaS referrals).
 */
export default async function NetworkReferralsPage() {
  const { staff } = await requireStaffNetwork();

  if (staff) {
    return (
      <PlatformHubPage
        title="Referrals"
        description="Referral activity flowing through the DigitalGate commercial network — not partner relationship records. Partners live under DigitalGate → Partners."
        links={[
          {
            href: "/command/referrals",
            label: "Referral queue",
            detail: "All · pending · converted.",
          },
          {
            href: "/command/referrals/pending",
            label: "Pending referrals",
            detail: "Introductions awaiting contact or follow-up.",
          },
          {
            href: "/command/partners",
            label: "Partners dashboard",
            detail: "Who referred them — relationship management.",
          },
        ]}
      />
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
    ? await listOrganisationBusinessReferrals(session.organisationId, 60)
    : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Referrals</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Business-to-business referrals — introductions between trusted businesses. To refer a
          business to DigitalGate, use{" "}
          <Link href="/dashboard/network/refer-earn" className="text-sky-400 hover:underline">
            Refer &amp; Earn
          </Link>
          . Create and advance referrals from a Contact detail page.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-100/80">
          {BUSINESS_REFERRAL_COMPLIANCE_NOTE}
        </div>

        <p className="text-sm text-slate-400">
          Open a{" "}
          <Link href="/apps/crm/contacts" className="text-blue-400 hover:underline">
            Contact
          </Link>{" "}
          to log a Free / Reciprocal / Paid / Commission referral. Paid &amp; Commission require
          disclosure.
        </p>

        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to list referrals.</p>
          </div>
        ) : !referrals.length ? (
          <div className="rounded-xl border border-dashed border-slate-700 px-6 py-10 text-center text-sm text-slate-400">
            No business referrals yet — scaffold is ready on Contact.
          </div>
        ) : (
          <ul className="space-y-3">
            {referrals.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{r.recipientBusiness}</p>
                  <p className="text-xs text-slate-500">
                    {BUSINESS_REFERRAL_TYPE_LABELS[r.type as BusinessReferralType]} ·{" "}
                    {BUSINESS_REFERRAL_STATUS_LABELS[r.status as BusinessReferralStatus]}
                    {r.feeDisclosure ? ` · ${r.feeDisclosure}` : ""}
                  </p>
                </div>
                <Link
                  href={`/apps/crm/contacts/${r.contactId}`}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Contact →
                </Link>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-slate-500">
          Earnings from referring DigitalGate subscriptions live in{" "}
          <Link href="/dashboard/network/refer-earn" className="text-blue-400 hover:underline">
            Refer &amp; Earn
          </Link>
          .
        </p>
      </main>
    </>
  );
}
