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
          Business-to-business referrals for your organisation.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-slate-500">{BUSINESS_REFERRAL_COMPLIANCE_NOTE}</p>
      </header>

      <main className="dg-page-main">
        {referrals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-5 py-8">
            <p className="font-medium text-white">No referrals yet</p>
            <p className="mt-2 max-w-lg text-sm text-slate-400">
              When your team refers work between businesses, activity will appear here.
            </p>
            <Link
              href="/dashboard/network"
              className="mt-4 inline-flex text-sm text-sky-400 hover:underline"
            >
              ← Network overview
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Business</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map((row) => (
                  <tr key={row.id} className="border-t border-slate-800/80">
                    <td className="px-3 py-2 font-medium text-white">
                      {row.businessName ?? row.contactName ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {BUSINESS_REFERRAL_TYPE_LABELS[row.type as BusinessReferralType] ??
                        row.type}
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {BUSINESS_REFERRAL_STATUS_LABELS[row.status as BusinessReferralStatus] ??
                        row.status}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {row.referredAt
                        ? new Date(row.referredAt).toLocaleDateString("en-AU")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
