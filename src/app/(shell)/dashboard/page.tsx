import Link from "next/link";
import {
  buildBusinessOverview,
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getOrganisationGoals,
  getPlatformSetupStatus,
  healthDeltaFromHistory,
  healthTrendFromHistory,
  isFoundingCustomerMode,
  listOrganisationActivities,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  persistHealthSnapshot,
  type OrgScoresResult,
} from "@dg/platform-core";

import { BusinessOverviewDashboard } from "@/components/overview/BusinessOverviewDashboard";
import { FoundingOperatorHome } from "@/components/overview/FoundingOperatorHome";
import { Gen2OnboardingChecklistBanner } from "@/components/onboarding/Gen2OnboardingChecklistBanner";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";

export default async function DashboardPage() {
  const { user, name, portal, session: platformSession } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIdsCached();
  const foundingCustomerMode =
    Boolean(platformSession) && isFoundingCustomerMode(enabledAppIds);

  let liveMetrics = null;
  let activities = null;
  let healthHistory: Awaited<ReturnType<typeof loadHealthHistory>> = [];
  let setupStatus = null;
  let connectorProbes: Awaited<ReturnType<typeof fetchOverviewConnectorProbes>> = {};

  if (platformSession) {
    [liveMetrics, activities, healthHistory, setupStatus, connectorProbes] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      listOrganisationActivities({
        organisationId: platformSession.organisationId,
        limit: 10,
      }),
      loadHealthHistory(platformSession.organisationId),
      getPlatformSetupStatus(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
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

  let healthScores: OrgScoresResult | null = null;
  if (platformSession && liveMetrics) {
    healthScores = buildLiveTwinWithScores({
      organisationId: platformSession.organisationId,
      organisationName: platformSession.organisationName,
      enabledAppIds,
      metrics: liveMetrics,
      connectors: connectorProbes,
      profile: businessProfile,
      metricsContext: metricsContextFromLiveMetrics(liveMetrics),
    }).scores;
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

  if (healthScores) {
    const available = new Set(healthScores.scores.map((score) => score.scoreId));
    const financeAvailable = healthScores.evidence.some(
      (item) => item.scoreId === "success_score" && item.state !== "unavailable",
    );
    const breakdownEvidence: Record<string, boolean> = {
      ai_visibility: available.has("ai_visibility"),
      seo: available.has("seo"),
      website: available.has("website_health"),
      marketing: available.has("business_growth"),
      sales: available.has("conversion"),
      cx: available.has("reputation"),
      automation: available.has("automation"),
      finance: financeAvailable,
    };
    overview = {
      ...overview,
      scoresLive: healthScores.scoresLive,
      businessHealth: healthScores.businessHealth,
      healthEvidenceCoveragePercent: healthScores.evidenceCoveragePercent,
      healthConfidence: healthScores.confidence,
      healthMeasurementCount: healthHistory.length,
      scoreBreakdown: overview.scoreBreakdown.filter((item) => breakdownEvidence[item.id] !== false),
    };
  }

  if (platformSession && liveMetrics && healthScores?.scoresLive) {
    const updatedHistory = await persistHealthSnapshot(
      platformSession.organisationId,
      healthScores.businessHealth,
    );
    const businessHealth = healthScores.businessHealth;
    const enoughHistory = updatedHistory.length >= 2;
    const healthDelta = enoughHistory
      ? healthDeltaFromHistory(updatedHistory, businessHealth)
      : 0;
    overview = {
      ...overview,
      businessHealth,
      businessHealthDelta: healthDelta,
      businessHealthDeltaLabel: enoughHistory
        ? `${healthDelta >= 0 ? "+" : ""}${healthDelta} this month`
        : `${updatedHistory.length} real measurement${updatedHistory.length === 1 ? "" : "s"} collected`,
      healthMeasurementCount: updatedHistory.length,
      healthTrend: healthTrendFromHistory(updatedHistory, businessHealth),
    };
  }

  return (
    <>
      {!platformSession ? (
        <header className="dg-page-header md:py-6 text-center md:text-left">
          <p className="text-lg text-slate-300">Welcome 👋</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Welcome to DigitalGate</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to open your live Business Overview.
          </p>
        </header>
      ) : foundingCustomerMode ? (
        <header className="dg-page-header md:py-6 text-center md:text-left">
          <p className="text-lg text-slate-300">{overview.greeting} 👋</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Here&apos;s what matters</h1>
          <p className="mt-2 text-sm text-slate-400">
            {overview.organisationName} · Updated {overview.lastUpdatedLabel}
          </p>
        </header>
      ) : null}

      <main className={platformSession && !foundingCustomerMode ? "dg-page-main pt-4 md:pt-6" : "dg-page-main"}>
        {!platformSession ? (
          <div className="dg-card mb-6 border-sky-500/30">
            <h2 className="font-semibold text-white">Your business workspace is ready when you are</h2>
            <p className="mt-1 text-sm text-slate-400">
              Sign in to load your organisation&apos;s Business Health, priorities, goals, activity and AI recommendations.
            </p>
            <Link
              href="/login"
              className="mt-4 inline-block rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
            >
              Sign in →
            </Link>
          </div>
        ) : (
          <>
            <Gen2OnboardingChecklistBanner organisationId={platformSession.organisationId} />
            {foundingCustomerMode ? (
              <FoundingOperatorHome
                overview={overview}
                enabledAppIds={enabledAppIds}
                openOpportunityCount={liveMetrics?.openOpportunityCount ?? 0}
              />
            ) : (
              <BusinessOverviewDashboard overview={overview} />
            )}
          </>
        )}
      </main>
    </>
  );
}
