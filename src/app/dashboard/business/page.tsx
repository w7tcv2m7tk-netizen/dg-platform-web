import { currentUser } from "@clerk/nextjs/server";
import { resolveActivePlatformSession } from "@/lib/active-platform-session";
import {
  captureDigitalTwinSnapshot,
  gatherOverviewLiveMetrics,
  getBusinessContext,
  getOrganisationBusinessProfile,} from "@dg/platform-core";

import { BusinessProfileEditor } from "@/components/platform/BusinessProfileEditor";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIdsCached } from "@/lib/org-apps";
import { ensureOrganisationOnboardingSync } from "@/lib/org-onboarding-sync";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";

export default async function BusinessProfilePage() {
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

  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const profile = session
    ? await getOrganisationBusinessProfile(session.organisationId)
    : null;

  let context = null;
  if (session) {
    const [metrics, connectors] = await Promise.all([
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
    ]);
    const twinSnapshot = metrics
      ? captureDigitalTwinSnapshot({
          organisationId: session.organisationId,
          organisationName: session.organisationName,
          enabledAppIds,
          metrics,
          connectors,
          profile,
        })
      : null;
    context = await getBusinessContext({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      twinSnapshot,
      profileOverride: profile,
    });
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Business Profile</h1>
        <p className="text-sm text-slate-400">
          Your Digital Business Identity — the foundation every app and AI capability references.
        </p>
      </header>
      <main className="dg-page-main">
        {!session || !context ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">
              Sign in with a configured organisation to manage your Business Profile.
            </p>
          </div>
        ) : (
          <BusinessProfileEditor
            profile={profile}
            context={context}
            linked={portal?.linked ?? false}
          />
        )}
      </main>
    </>
  );
}
