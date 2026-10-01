import { cookies } from "next/headers";
import { SectionPageHeader } from "@/components/ui/SectionPageHeader";
import {
  attributeOrganisationReferral,
  getReferAndEarnDashboard,
  REFERRAL_COOKIE,
} from "@dg/platform-core";

import { ReferAndEarnPanel } from "@/components/settings/ReferAndEarnPanel";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function SettingsReferralProgrammePage() {
  const { email, session } = await getPlatformPageContext();

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

  const dash = session ? await getReferAndEarnDashboard(session.organisationId) : null;

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.digitalgate.com.au"
  ).replace(/\/$/, "");

  return (
    <>
      <SectionPageHeader section="Settings" title="Referral Programme" />
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
            canEditTier={session.role === "owner" || session.role === "admin"}
            canManageConnect={session.role === "owner" || session.role === "admin"}
          />
        )}
      </main>
    </>
  );
}
