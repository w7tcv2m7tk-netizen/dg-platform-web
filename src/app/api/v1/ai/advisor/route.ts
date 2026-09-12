import { NextResponse } from "next/server";
import {
  askBusinessAdvisor,
  buildAdvisorBriefing,
  buildBusinessBenchmarks,
  buildBusinessBrain,
  buildBusinessHealth,
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  generateBusinessIntelligence,
  getBusinessContext,
  getOrganisationBusinessProfile,
  getOrganisationGoals,
  getPlatformSetupStatus,
  loadHealthHistory,
  metricsContextFromLiveMetrics,
  scoresFromLatestSeoAudit,
} from "@dg/platform-core";

import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";
import { isNextResponse, requirePlatformAuth } from "@/lib/platform-api";

type SeoAuditSnapshot = NonNullable<
  Awaited<ReturnType<typeof scoresFromLatestSeoAudit>>
>;

function buildSeoAuditEvidence(audit: SeoAuditSnapshot | null): string | undefined {
  if (!audit) return undefined;

  const probes = audit.probes
    ? [
        ["reachable", audit.probes.reachable],
        ["HTTPS", audit.probes.https],
        ["title", Boolean(audit.probes.title)],
        ["meta description", audit.probes.hasMetaDescription],
        ["mobile viewport", audit.probes.hasViewport],
        ["Open Graph", audit.probes.hasOpenGraph],
        ["JSON-LD", audit.probes.hasJsonLd],
        ["H1", audit.probes.hasH1],
      ]
        .map(([label, value]) => `${label}: ${value === true ? "pass" : value === false ? "fail" : "unknown"}`)
        .join("; ")
    : "No probe details stored";

  const findings = audit.findings
    .slice(0, 8)
    .map(
      (finding, index) =>
        `${index + 1}. [${finding.severity}] ${finding.title}: ${finding.detail}${
          finding.recommendedAction ? ` Next: ${finding.recommendedAction}` : ""
        }`,
    )
    .join("\n");

  return [
    `Source: persisted DigitalGate SEO audit from ${audit.auditedAt}${
      audit.websiteUrl ? ` for ${audit.websiteUrl}` : ""
    }`,
    `SEO ${audit.scores.seo}/100; Website Health ${audit.scores.websiteHealth}/100; AI Visibility ${audit.scores.aiVisibility}/100; Studio SEO ${audit.scores.nativeSeo ?? "not available"}`,
    `Public probes: ${probes}`,
    findings ? `Prioritised audit findings:\n${findings}` : "Audit findings: none recorded",
  ].join("\n");
}

/**
 * POST /api/v1/ai/advisor
 * Free-text customer Advisor ask — Brain + Twin context → Model Router → answer.
 */
export async function POST(req: Request) {
  const session = await requirePlatformAuth(req);
  if (isNextResponse(session)) return session;

  let body: { question?: string; contextLabel?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_json", message: "Invalid JSON body" } },
      { status: 400 },
    );
  }

  const question = body.question?.trim() ?? "";
  if (!question) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "question is required" } },
      { status: 422 },
    );
  }

  const contextLabel = body.contextLabel?.trim();
  const isSeoContext = contextLabel === "SEO" || contextLabel === "AI Visibility";

  const userDisplayName = session.name?.split(" ")[0] || session.email || "there";
  const enabledAppIds = await getOrgEnabledAppIds();
  const [profile, metrics, connectors, setupStatus, healthHistory, reviewsBundle, goals] =
    await Promise.all([
      getOrganisationBusinessProfile(session.organisationId),
      gatherOverviewLiveMetrics(session.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, session.organisationId),
      getPlatformSetupStatus(session.organisationId),
      loadHealthHistory(session.organisationId),
      loadReviewsSessionAndFeed(),
      getOrganisationGoals(session.organisationId),
    ]);

  const reputation = computeReputationScore(reviewsBundle.feed);
  let twinScores = null;
  let snapshot = null;
  if (metrics) {
    const built = buildLiveTwinWithScores({
      organisationId: session.organisationId,
      organisationName: session.organisationName,
      enabledAppIds,
      metrics,
      connectors,
      profile,
      metricsContext: metricsContextFromLiveMetrics(metrics),
      reputationOverride: reputation.score,
    });
    twinScores = built.scores;
    snapshot = built.snapshot;
  }

  const businessContext = await getBusinessContext({
    organisationId: session.organisationId,
    organisationName: session.organisationName,
    enabledAppIds,
    twinSnapshot: snapshot,
    profileOverride: profile,
    goalsOverride: goals,
  });

  const brain = buildBusinessBrain({
    context: businessContext,
    setup: setupStatus,
    connectorCount: businessContext.twin.connectedSystems.length,
  });

  const health = buildBusinessHealth({
    enabledAppIds,
    metrics,
    connectors,
    scores: twinScores,
    reputation,
    healthHistory,
  });

  const benchmarks = buildBusinessBenchmarks({
    organisationName: session.organisationName,
    enabledAppIds,
    profile,
    metrics,
    connectors,
    scores: twinScores,
    snapshot,
    brain,
    reputation,
    healthHistory,
    setupStatus,
    networkCohortSize: 0,
  });

  const intelligence =
    metrics && snapshot && twinScores
      ? generateBusinessIntelligence({
          organisationName: session.organisationName,
          userDisplayName,
          enabledAppIds,
          metrics,
          connectors,
          snapshot,
          scores: twinScores,
          goals,
        })
      : null;

  const briefing = buildAdvisorBriefing({
    userDisplayName,
    organisationName: session.organisationName,
    enabledAppIds,
    metrics,
    scores: twinScores,
    intelligence,
    brain,
    health,
    benchmarks,
  });

  const additionalEvidence = isSeoContext
    ? buildSeoAuditEvidence(
        await scoresFromLatestSeoAudit(session.organisationId).catch(() => null),
      )
    : undefined;

  const result = await askBusinessAdvisor({
    organisationId: session.organisationId,
    actorId: session.clerkUserId,
    question,
    contextLabel,
    additionalEvidence,
    businessContext,
    briefing: {
      todaySummary: briefing.todaySummary,
      topRecommendations: briefing.topRecommendations,
      brainCompleteness: briefing.brainCompleteness,
      businessHealth: briefing.businessHealth,
    },
  });

  return NextResponse.json({ data: result });
}
