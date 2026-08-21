import Link from "next/link";
import { after } from "next/server";
import {
  buildBusinessOverview,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getOrganisationGoals,
  getPlatformSetupStatus,
  healthDeltaFromHistory,
  healthTrendFromHistory,
  listOrganisationActivities,
  loadHealthHistory,
  persistHealthSnapshot,
} from "@dg/platform-core";

import { BusinessOverviewDashboard } from "@/components/overview/BusinessOverviewDashboard";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { autoSyncWordPressVendorLeadsIfNeeded } from "@/lib/wordpress-sync";

export default async function DashboardPage() {
  const { user, name, portal, session: platformSession } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIdsCached();

  let liveMetrics = null;
  let connectorProbes = {};
  let activities = null;
  let healthHistory: Awaited<ReturnType<typeof loadHealthHistory>> = [];
  let setupStatus = null;

  if (platformSession) {
    after(async () => {
      await autoSyncWordPressVendorLeadsIfNeeded(platformSession).catch(() => null);
    });

    [liveMetrics, connectorProbes, activities, healthHistory, setupStatus] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
      listOrganisationActivities({
        organisationId: platformSession.organisationId,
        limit: 10,
      }),
      loadHealthHistory(platformSession.organisationId),
      getPlatformSetupStatus(platformSession.organisationId),
    ]);
  }

  let businessProfile = null;
  let goals = undefined as Awaited<ReturnType<typeof getOrganisationGoals>> | undefined;
  if (platformSession) {
    [businessProfile, goals] = await Promise.all([
      getOrganisationBusinessProfile(platformSession.organisationId),
      getOrganisationGoals(platformSession.organisationId),
    ]);
  }

  let overview = buildBusinessOverview({
    organisationId: platformSession?.organisationId,
    organisationName: platformSession?.organisationName ?? portal?.org_name ?? "Your business",
    userDisplayName: user?.firstName ?? name,
    enabledAppIds,
    businessProfile,
    setupStatus,
    activities: activities?.items,
    liveMetrics,
    connectorProbes,
    healthHistory,
    goals,
  });

  if (platformSession && liveMetrics && overview.scoresLive) {
    const updatedHistory = await persistHealthSnapshot(
      platformSession.organisationId,
      overview.businessHealth,
    );
    const businessHealth = overview.businessHealth;
    const healthDelta = healthDeltaFromHistory(updatedHistory, businessHealth);
    overview = {
      ...overview,
      businessHealthDelta: healthDelta,
      businessHealthDeltaLabel: `${healthDelta >= 0 ? "+" : ""}${healthDelta} this month`,
      healthTrend: healthTrendFromHistory(updatedHistory, businessHealth),
    };
  }

  return (
    <>
      <header className="dg-page-header md:py-6 text-center md:text-left">
        <p className="text-lg text-slate-300">
          {overview.greeting} 👋
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          Welcome back to {overview.organisationName}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-4 md:justify-start">
          <div className="flex flex-wrap items-baseline justify-center gap-2 md:justify-start">
            <span className="text-sm text-slate-400">Business Health:</span>
            <span className="text-2xl font-bold text-emerald-400">{overview.businessHealth}/100</span>
            <span className={`text-sm ${overview.businessHealthDelta >= 0 ? "text-emerald-400/80" : "text-amber-400/80"}`}>
              {overview.businessHealthDelta >= 0 ? "↑" : "↓"} {overview.businessHealthDeltaLabel}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Last updated: {overview.lastUpdatedLabel}
          </span>
          {overview.growthOpportunityCount > 0 ? (
            <Link
              href="#growth-opportunities"
              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 hover:border-emerald-400/50"
            >
              {overview.growthOpportunityCount} growth opportunit
              {overview.growthOpportunityCount === 1 ? "y" : "ies"}
            </Link>
          ) : null}
          <Link
            href="/dashboard/brain"
            className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 hover:border-sky-400/50"
          >
            Business Brain →
          </Link>
        </div>
      </header>
      <main className="dg-page-main">
        {!platformSession ? (
          <div className="dg-card mb-6 border-amber-500/30">
            <p className="text-amber-300">
              Sign in to load your workspace overview.
            </p>
          </div>
        ) : null}
        <BusinessOverviewDashboard overview={overview} />
      </main>
    </>
  );
}
