import { currentUser } from "@clerk/nextjs/server";
import {
  buildBusinessOverview,
  gatherOverviewLiveMetrics,
  listOrganisationActivities,
  resolvePlatformSession,
} from "@dg/platform-core";

import { BusinessOverviewDashboard } from "@/components/overview/BusinessOverviewDashboard";
import { fetchPortalMe } from "@/lib/dg-api";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { autoSyncWordPressVendorLeadsIfNeeded } from "@/lib/wordpress-sync";

export default async function DashboardPage() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const clerkUserId = user?.id;
  const name =
    user?.fullName ??
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ??
    email;

  const portal = email && clerkUserId ? await fetchPortalMe(email, clerkUserId) : null;
  const platformSession =
    clerkUserId && email
      ? await resolvePlatformSession({
          clerkUserId,
          email,
          name,
          orgName: portal?.org_name,
        })
      : null;

  const enabledAppIds = await getOrgEnabledAppIds();

  let liveMetrics = null;
  let connectorProbes = {};
  let activities = null;

  if (platformSession) {
    await autoSyncWordPressVendorLeadsIfNeeded(platformSession).catch(() => null);

    [liveMetrics, connectorProbes, activities] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
      listOrganisationActivities({
        organisationId: platformSession.organisationId,
        limit: 10,
      }),
    ]);
  }

  const overview = buildBusinessOverview({
    organisationId: platformSession?.organisationId,
    organisationName: platformSession?.organisationName ?? portal?.org_name ?? "Your business",
    userDisplayName: user?.firstName ?? name,
    enabledAppIds,
    setupStatus: liveMetrics
      ? {
          orgProvisioned: true,
          hasTeamMember: true,
          hasContacts: liveMetrics.hasContacts,
          hasTimelineActivity: liveMetrics.hasTimelineActivity,
          contactCount: liveMetrics.contactCount,
          activityCount: liveMetrics.activityCount,
        }
      : null,
    activities: activities?.items,
    liveMetrics,
    connectorProbes,
  });

  return (
    <>
      <header className="border-b border-slate-800 px-8 py-6">
        <p className="text-lg text-slate-300">
          {overview.greeting} 👋
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Welcome back to {overview.organisationName}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-slate-400">Business Health:</span>
            <span className="text-2xl font-bold text-emerald-400">{overview.businessHealth}/100</span>
            <span className="text-sm text-emerald-400/80">↑ {overview.businessHealthDeltaLabel}</span>
          </div>
          <span className="text-xs text-slate-500">
            Last updated: {overview.lastUpdatedLabel}
          </span>
        </div>
      </header>
      <main className="flex-1 p-8">
        {!platformSession ? (
          <div className="dg-card mb-6 border-amber-500/30">
            <p className="text-amber-300">
              Set <code className="text-amber-200">DATABASE_URL</code> and run{" "}
              <code className="text-amber-200">npm run db:push</code> to enable live KPIs and timeline.
            </p>
          </div>
        ) : null}
        <BusinessOverviewDashboard overview={overview} />
      </main>
    </>
  );
}
