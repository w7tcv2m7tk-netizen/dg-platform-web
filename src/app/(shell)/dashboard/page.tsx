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
  listOrgSeoAudits,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  persistHealthSnapshot,
  type OrgScoresResult,
} from "@dg/platform-core";

import { BusinessOverviewDashboard } from "@/components/overview/BusinessOverviewDashboard";
import {
  DigitalPerformanceStrip,
  type DigitalPerformanceSignal,
} from "@/components/overview/DigitalPerformanceStrip";
import { FoundingOperatorHome } from "@/components/overview/FoundingOperatorHome";
import { Gen2OnboardingChecklistBanner } from "@/components/onboarding/Gen2OnboardingChecklistBanner";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIdsCached, getPlatformPageContext } from "@/lib/org-apps";

const AUDIT_FRESH_MS = 30 * 24 * 60 * 60 * 1000;

function normalisedHost(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const raw = value.trim();
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function scoreValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function auditScores(metadata: Record<string, unknown> | null | undefined) {
  const raw = metadata?.scores;
  if (!raw || typeof raw !== "object") return null;
  const scores = raw as Record<string, unknown>;
  const seo = scoreValue(scores.seo);
  const aiVisibility = scoreValue(scores.aiVisibility);
  const websiteHealth = scoreValue(scores.websiteHealth);
  if (seo == null || aiVisibility == null || websiteHealth == null) return null;
  return { seo, aiVisibility, websiteHealth };
}

function formatAuditDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "previous audit";
  return date.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

async function latestDomainMatchedSeoAudit(organisationId: string, websiteUrl: string | null | undefined) {
  const expectedHost = normalisedHost(websiteUrl);
  if (!expectedHost) return null;

  const audits = await listOrgSeoAudits(organisationId, 30);
  for (const audit of audits) {
    const metadata = audit.metadata as Record<string, unknown> | null | undefined;
    const auditedHost = normalisedHost(metadata?.websiteUrl);
    if (auditedHost !== expectedHost) continue;
    const scores = auditScores(metadata);
    if (!scores) continue;
    const ageMs = Date.now() - Date.parse(audit.createdAt);
    return {
      auditedAt: audit.createdAt,
      host: expectedHost,
      scores,
      fresh: Number.isFinite(ageMs) && ageMs >= 0 && ageMs <= AUDIT_FRESH_MS,
    };
  }
  return null;
}

function buildDigitalPerformanceSignals(input: {
  websiteScore?: number;
  websiteLabel?: string;
  matchedAudit: Awaited<ReturnType<typeof latestDomainMatchedSeoAudit>>;
}): DigitalPerformanceSignal[] {
  const operationsScore = scoreValue(input.websiteScore);
  const audit = input.matchedAudit;
  const auditState: DigitalPerformanceSignal["state"] = audit
    ? audit.fresh
      ? "live"
      : "stale"
    : "unavailable";
  const auditDate = audit ? formatAuditDate(audit.auditedAt) : null;

  return [
    {
      id: "website_operations",
      label: "Website Operations",
      value: operationsScore == null ? "Not measured" : `${operationsScore} / 100`,
      detail:
        operationsScore == null
          ? "No native website operational check is available yet."
          : `Platform readiness for ${input.websiteLabel ?? "your site"}: publishing, domain, DNS, SSL, CRM capture and SEO configuration.`,
      href: "/apps/websites/health",
      state: operationsScore == null ? "unavailable" : "live",
    },
    {
      id: "seo",
      label: "SEO",
      value: audit ? `${audit.scores.seo} / 100` : "No matched audit",
      detail: audit
        ? `${audit.fresh ? "Measured" : "Last measured"} on ${auditDate} for ${audit.host}.`
        : "Run an SEO audit for the website saved in this organisation's Business Profile.",
      href: "/apps/seo",
      state: auditState,
    },
    {
      id: "ai_visibility",
      label: "AI Visibility",
      value: audit ? `${audit.scores.aiVisibility} / 100` : "No matched audit",
      detail: audit
        ? `${audit.fresh ? "Measured" : "Last measured"} on ${auditDate} for ${audit.host}; never borrowed from another website audit.`
        : "Run the organisation's website audit to establish measured AI/search visibility signals.",
      href: "/apps/ai-visibility",
      state: auditState,
    },
    {
      id: "analytics",
      label: "Web Analytics",
      value: "Not connected",
      detail: "Connect a real web analytics source before showing traffic, users or conversion performance here.",
      href: "/apps/analytics/connectors",
      state: "unavailable",
    },
  ];
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

  const matchedSeoAudit = platformSession
    ? await latestDomainMatchedSeoAudit(platformSession.organisationId, businessProfile?.websiteUrl)
    : null;

  const digitalPerformanceSignals = buildDigitalPerformanceSignals({
    websiteScore: connectorProbes.website?.score,
    websiteLabel: connectorProbes.website?.siteLabel ?? businessProfile?.websiteUrl ?? undefined,
    matchedAudit: matchedSeoAudit,
  });

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
      scoreBreakdown: overview.scoreBreakdown
        .filter((item) => breakdownEvidence[item.id] !== false)
        .map((item) =>
          item.id === "website"
            ? { ...item, label: "Website Operations" }
            : item,
        ),
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
              <>
                <DigitalPerformanceStrip signals={digitalPerformanceSignals} />
                <BusinessOverviewDashboard overview={overview} />
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
