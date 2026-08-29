import {
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  metricsContextFromLiveMetrics,
  scoresFromLatestSeoAudit,
  type OverviewConnectorProbes,
} from "@dg/platform-core";

import { AiVisibilityDashboard } from "@/components/ai-visibility/AiVisibilityDashboard";
import type {
  WebsiteSignalFinding,
  WebsiteSignalProbes,
} from "@/components/seo/WebsiteSignalsPanel";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

function toPlainFindings(
  findings: Array<{
    domain: string;
    severity: string;
    title: string;
    detail: string;
    recommendedAction?: string;
  }>,
): WebsiteSignalFinding[] {
  return findings.map((f) => ({
    domain: String(f.domain ?? ""),
    severity: String(f.severity ?? "opportunity"),
    title: String(f.title ?? ""),
    detail: String(f.detail ?? ""),
    ...(f.recommendedAction
      ? { recommendedAction: String(f.recommendedAction) }
      : {}),
  }));
}

function toPlainProbes(
  probes: {
    reachable?: boolean | null;
    https?: boolean | null;
    title?: string | null;
    hasMetaDescription?: boolean;
    hasViewport?: boolean;
    hasOpenGraph?: boolean;
    hasJsonLd?: boolean;
    hasH1?: boolean;
  } | null,
): WebsiteSignalProbes | null {
  if (!probes) return null;
  return {
    reachable: typeof probes.reachable === "boolean" ? probes.reachable : null,
    https: typeof probes.https === "boolean" ? probes.https : null,
    title: typeof probes.title === "string" ? probes.title : null,
    hasMetaDescription: Boolean(probes.hasMetaDescription),
    hasViewport: Boolean(probes.hasViewport),
    hasOpenGraph: Boolean(probes.hasOpenGraph),
    hasJsonLd: Boolean(probes.hasJsonLd),
    hasH1: Boolean(probes.hasH1),
  };
}

export default async function AiVisibilityPage() {
  let firstName = "there";
  let aiVisibilityScore: number | null = null;
  let businessHealth: number | null = null;
  let scoreSource: "audit" | "provisional" | "none" = "none";
  const scoreBreakdown: {
    id: string;
    label: string;
    value: number | null;
    href?: string;
    provisional?: boolean;
  }[] = [
    { id: "ai_visibility", label: "AI Visibility", value: null, href: "/apps/ai-visibility" },
    { id: "seo", label: "SEO", value: null, href: "/apps/seo" },
    { id: "website", label: "Website Health", value: null, href: "/apps/websites/health" },
    { id: "reputation", label: "Reputation", value: null, href: "/apps/reviews" },
  ];
  const profileGaps: string[] = [];
  let websiteUrl: string | null = null;
  let auditedAt: string | null = null;
  let probes: WebsiteSignalProbes | null = null;
  let findings: WebsiteSignalFinding[] = [];
  let loadError: string | null = null;

  try {
    const { session: platformSession, user } = await getPlatformPageContext();
    firstName = user?.firstName ?? "there";
    const enabledAppIds = await getOrgEnabledAppIds();

    if (platformSession) {
      const [metricsResult, connectorsResult, profileResult, latestAuditResult, reviewsResult] =
        await Promise.allSettled([
          gatherOverviewLiveMetrics(platformSession.organisationId),
          fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
          getOrganisationBusinessProfile(platformSession.organisationId),
          scoresFromLatestSeoAudit(platformSession.organisationId),
          loadReviewsSessionAndFeed(),
        ]);

      const metrics =
        metricsResult.status === "fulfilled" ? metricsResult.value : null;
      const connectors: OverviewConnectorProbes =
        connectorsResult.status === "fulfilled" ? connectorsResult.value : {};
      const profile =
        profileResult.status === "fulfilled" ? profileResult.value : null;
      const latestAudit =
        latestAuditResult.status === "fulfilled" ? latestAuditResult.value : null;
      const reviewsBundle =
        reviewsResult.status === "fulfilled"
          ? reviewsResult.value
          : { feed: [], feedStatus: { ok: false, total: 0, byPlatform: {} } };

      if (metricsResult.status === "rejected") {
        console.error("[ai-visibility] metrics failed", metricsResult.reason);
      }
      if (latestAuditResult.status === "rejected") {
        console.error("[ai-visibility] audit failed", latestAuditResult.reason);
      }
      if (reviewsResult.status === "rejected") {
        console.error("[ai-visibility] reviews failed", reviewsResult.reason);
      }

      websiteUrl = latestAudit?.websiteUrl ?? profile?.websiteUrl?.trim() ?? null;
      auditedAt = latestAudit?.auditedAt ?? null;
      probes = toPlainProbes(latestAudit?.probes ?? null);
      findings = toPlainFindings(latestAudit?.findings ?? []);

      let reputationScore: number | null = null;
      try {
        reputationScore = computeReputationScore(reviewsBundle.feed).score;
      } catch (err) {
        console.error("[ai-visibility] reputation score failed", err);
      }
      scoreBreakdown[3] = {
        ...scoreBreakdown[3],
        value: reputationScore,
      };

      const presenceOverride = latestAudit?.fresh
        ? {
            seo: latestAudit.scores.seo,
            aiVisibility: latestAudit.scores.aiVisibility,
            websiteHealth: latestAudit.scores.websiteHealth,
          }
        : null;

      if (metrics) {
        try {
          const { scores } = buildLiveTwinWithScores({
            organisationId: platformSession.organisationId,
            organisationName: platformSession.organisationName,
            enabledAppIds,
            metrics,
            connectors,
            profile,
            metricsContext: metricsContextFromLiveMetrics(metrics),
            presenceAuditOverride: presenceOverride,
            reputationOverride: reputationScore,
          });

          businessHealth = scores.businessHealth;

          if (latestAudit) {
            const provisional = !latestAudit.fresh;
            aiVisibilityScore = latestAudit.scores.aiVisibility;
            scoreSource = latestAudit.fresh ? "audit" : "provisional";
            scoreBreakdown[0] = {
              ...scoreBreakdown[0],
              value: latestAudit.scores.aiVisibility,
              provisional,
            };
            scoreBreakdown[1] = {
              ...scoreBreakdown[1],
              value: latestAudit.scores.seo,
              provisional,
            };
            scoreBreakdown[2] = {
              ...scoreBreakdown[2],
              value: latestAudit.scores.websiteHealth,
              provisional,
            };
          } else {
            aiVisibilityScore = getScoreValue(scores.scores, "ai_visibility");
            scoreSource = "provisional";
            scoreBreakdown[0] = {
              ...scoreBreakdown[0],
              value: aiVisibilityScore,
              provisional: true,
            };
            scoreBreakdown[1] = {
              ...scoreBreakdown[1],
              value: getScoreValue(scores.scores, "seo"),
              provisional: true,
            };
            scoreBreakdown[2] = {
              ...scoreBreakdown[2],
              value: getScoreValue(scores.scores, "website_health"),
              provisional: true,
            };
          }
        } catch (err) {
          console.error("[ai-visibility] twin scores failed", err);
          if (latestAudit) {
            aiVisibilityScore = latestAudit.scores.aiVisibility;
            scoreSource = latestAudit.fresh ? "audit" : "provisional";
            scoreBreakdown[0] = {
              ...scoreBreakdown[0],
              value: latestAudit.scores.aiVisibility,
            };
            scoreBreakdown[1] = {
              ...scoreBreakdown[1],
              value: latestAudit.scores.seo,
            };
            scoreBreakdown[2] = {
              ...scoreBreakdown[2],
              value: latestAudit.scores.websiteHealth,
            };
          }
        }
      } else if (latestAudit) {
        const provisional = !latestAudit.fresh;
        aiVisibilityScore = latestAudit.scores.aiVisibility;
        scoreSource = latestAudit.fresh ? "audit" : "provisional";
        scoreBreakdown[0] = {
          ...scoreBreakdown[0],
          value: latestAudit.scores.aiVisibility,
          provisional,
        };
        scoreBreakdown[1] = {
          ...scoreBreakdown[1],
          value: latestAudit.scores.seo,
          provisional,
        };
        scoreBreakdown[2] = {
          ...scoreBreakdown[2],
          value: latestAudit.scores.websiteHealth,
          provisional,
        };
      }

      if (profile) {
        if (!profile.websiteUrl?.trim()) {
          profileGaps.push("Website URL missing from Business Profile");
        }
        if (!profile.social?.googleBusiness?.trim()) {
          profileGaps.push("Google Business Profile not linked");
        }
        if (!profile.tradingName?.trim() && !profile.businessName?.trim()) {
          profileGaps.push("Business name helps AI models identify your brand");
        }
      }

      if (!websiteUrl && !latestAudit) {
        aiVisibilityScore = null;
        scoreSource = "none";
        scoreBreakdown[0] = { ...scoreBreakdown[0], value: null };
        scoreBreakdown[1] = { ...scoreBreakdown[1], value: null };
        scoreBreakdown[2] = { ...scoreBreakdown[2], value: null };
      }
    }
  } catch (err) {
    console.error("[ai-visibility] page load failed", err);
    loadError =
      "We could not load AI Visibility scores right now. You can still run a website presence scan below.";
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">AI Visibility</h1>
        <p className="text-sm text-slate-400">
          {firstName}&apos;s website readiness for AI answer engines — evidence from live HTML
          probes
        </p>
      </header>
      <main className="dg-page-main">
        {loadError ? (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </p>
        ) : null}
        <AiVisibilityDashboard
          aiVisibilityScore={aiVisibilityScore}
          businessHealth={businessHealth}
          scoreSource={scoreSource}
          scoreBreakdown={scoreBreakdown}
          profileGaps={profileGaps}
          websiteUrl={websiteUrl}
          auditedAt={auditedAt}
          probes={probes}
          findings={findings}
        />
      </main>
    </>
  );
}
