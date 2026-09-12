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
  reconcileAiRecommendationOutcomes,
  recordAiRecommendationTelemetry,
  type OrgScoresResult,
  type OverviewRecommendedAction,
} from "@dg/platform-core";

import { BusinessOverviewDashboard } from "@/components/overview/BusinessOverviewDashboard";
import { FoundingOperatorHome } from "@/components/overview/FoundingOperatorHome";
import { Gen2OnboardingChecklistBanner } from "@/components/onboarding/Gen2OnboardingChecklistBanner";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";

function trackedRecommendationHref(action: OverviewRecommendedAction) {
  if (!action.href) return undefined;
  const params = new URLSearchParams({
    recommendationId: action.id,
    redirect: action.href,
    label: action.label,
    impact: action.impact,
  });
  return `/api/v1/intelligence/recommendations/start?${params.toString()}`;
}

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
      healthTrend: healthTrendFromHistory(updatedHistory, businessHealth),
    };
  }

  if (platformSession && liveMetrics && !foundingCustomerMode) {
    try {
      const websiteIssueCount = connectorProbes.website
        ? (connectorProbes.website.fail ?? 0) + (connectorProbes.website.warn ?? 0)
        : null;
      await reconcileAiRecommendationOutcomes({
        organisationId: platformSession.organisationId,
        evidence: {
          overdueFollowUps: liveMetrics.overdueFollowUps,
          overdueArCents: liveMetrics.overdueArCents,
          activeGoalIds: (goals ?? [])
            .filter((goal) => goal.status === "active")
            .map((goal) => goal.id),
          completedGoalIds: overview.goals
            .filter((goal) => goal.percent >= 100)
            .map((goal) => goal.id),
          aiVisibilityScore:
            overview.scoreBreakdown.find((item) => item.id === "ai_visibility")?.value ?? null,
          businessHealthEvidenceCoverage: healthScores?.evidenceCoveragePercent ?? null,
          websiteIssueCount,
        },
      });

      await Promise.all(
        overview.recommendedActions.map((action) =>
          recordAiRecommendationTelemetry({
            organisationId: platformSession.organisationId,
            actorId: platformSession.clerkUserId,
            recommendationId: action.id,
            stage: "shown",
            label: action.label,
            impact: action.impact,
            href: action.href ?? null,
            source: "business_overview",
          }),
        ),
      );
    } catch (err) {
      // Intelligence telemetry is observational and must never break the dashboard.
      console.error("[intelligence] recommendation telemetry failed", err);
    }

    overview = {
      ...overview,
      recommendedActions: overview.recommendedActions.map((action) => ({
        ...action,
        href: trackedRecommendationHref(action),
      })),
    };
  }

  const confidenceLabel = healthScores
    ? healthScores.confidence === "high"
      ? "High confidence"
      : healthScores.confidence === "medium"
        ? "Medium confidence"
        : healthScores.confidence === "low"
          ? "Low confidence"
          : "Insufficient evidence"
    : null;

  return (
    <>
      <header className="dg-page-header md:py-6 text-center md:text-left">
        <p className="text-lg text-slate-300">
          {overview.greeting} 👋
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {foundingCustomerMode
            ? "Here's what matters"
            : platformSession
              ? `Welcome back to ${overview.organisationName}`
              : "Welcome to DigitalGate"}
        </h1>
        {platformSession && !foundingCustomerMode ? (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 md:justify-start">
            <div className="flex flex-wrap items-baseline justify-center gap-2 md:justify-start">
              <span className="text-sm text-slate-400">Business Health:</span>
              {overview.scoresLive ? (
                <Link href="/dashboard/health" className="inline-flex flex-wrap items-baseline gap-2 hover:opacity-90">
                  <span className="text-2xl font-bold text-emerald-400">{overview.businessHealth}/100</span>
                  <span className={`text-sm ${overview.businessHealthDelta >= 0 ? "text-emerald-400/80" : "text-amber-400/80"}`}>
                    {overview.businessHealthDelta >= 0 ? "↑" : "↓"} {overview.businessHealthDeltaLabel}
                  </span>
                </Link>
              ) : (
                <Link href="/dashboard/health" className="text-sm font-medium text-sky-300 hover:underline">
                  Not enough measured evidence yet
                </Link>
              )}
            </div>
            {healthScores ? (
              <Link href="/dashboard/health" className="text-xs text-slate-400 hover:text-sky-300">
                {healthScores.evidenceCoveragePercent}% evidence coverage · {confidenceLabel}
              </Link>
            ) : null}
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
              className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 hover:underline"
            >
              Business Brain →
            </Link>
          </div>
        ) : foundingCustomerMode ? (
          <p className="mt-2 text-sm text-slate-400">
            {overview.organisationName} · Updated {overview.lastUpdatedLabel}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-400">
            Sign in to open your live Business Overview.
          </p>
        )}
      </header>
      <main className="dg-page-main">
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
