import Link from "next/link";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import { currentUser } from "@clerk/nextjs/server";
import {
  attributeOrganisationReferral,
  getReferAndEarnDashboard,
  REFERRAL_COOKIE,
} from "@dg/platform-core";
import { cookies } from "next/headers";

import { ReferAndEarnPanel } from "@/components/settings/ReferAndEarnPanel";
import { fetchPortalMe } from "@/lib/dg-api";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";

export default async function ReferAndEarnPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email ? await fetchPortalMe(email, user?.id) : null;
  await ensureOrganisationOnboardingSync();
  const session = user?.id
    ? await resolveActivePlatformSession({
        clerkUserId: user.id,
        email,
        name,
        orgName: portal?.org_name,
      })
    : null;

  if (session) {
    const jar = await cookies();
    const ref = jar.get(REFERRAL_COOKIE)?.value;
    if (ref) {
      await attributeOrganisationReferral({
        organisationId: session.organisationId,
        referralCode: ref,
        inviteEmail: email,
      });
    }
  }

  const dash = session
    ? await getReferAndEarnDashboard(session.organisationId)
    : null;

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://app.digitalgate.com.au"
  ).replace(/\/$/, "");

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard/settings" className="text-sm text-blue-400 hover:underline">
          ← Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Refer &amp; Earn</h1>
        <p className="text-sm text-slate-400">
          Share DigitalGate — earn platform credit for 12 months when they subscribe
          (Customer 20% · Partner 25% · Reseller 30%)
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session || !dash ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view your referral programme.</p>
          </div>
        ) : (
          <ReferAndEarnPanel
            shareUrl={`${appUrl}${dash.sharePath}`}
            code={dash.code}
            metrics={dash.metrics}
            referrals={dash.referrals}
            stubsNote={dash.stubs.note}
            programme={dash.programme}
            connect={dash.connect}
            canEditTier={
              session.role === "owner" || session.role === "admin"
            }
            canManageConnect={
              session.role === "owner" || session.role === "admin"
            }
          />
        )}
      </main>
    </>
  );
}
