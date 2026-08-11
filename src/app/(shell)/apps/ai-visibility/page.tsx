import {
  buildLiveTwinWithScores,
  computeReputationScore,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  metricsContextFromLiveMetrics,
  scoresFromLatestSeoAudit,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { AiVisibilityDashboard } from "@/components/ai-visibility/AiVisibilityDashboard";
import type {
  WebsiteSignalFinding,
  WebsiteSignalProbes,
} from "@/components/seo/WebsiteSignalsPanel";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { loadReviewsSessionAndFeed } from "@/lib/reviews-feed";

export default async function AiVisibilityPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIds();

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

  if (platformSession) {
    const [metrics, connectors, profile, latestAudit, reviewsBundle] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
      getOrganisationBusinessProfile(platformSession.organisationId),
      scoresFromLatestSeoAudit(platformSession.organisationId),
      loadReviewsSessionAndFeed(),
    ]);

    websiteUrl = latestAudit?.websiteUrl ?? profile?.websiteUrl?.trim() ?? null;
    auditedAt = latestAudit?.auditedAt ?? null;
    probes = latestAudit?.probes ?? null;
    findings = latestAudit?.findings ?? [];

    const reputationFromFeed = computeReputationScore(reviewsBundle.feed);
    scoreBreakdown[3] = {
      ...scoreBreakdown[3],
      value: reputationFromFeed.score,
    };

    const presenceOverride = latestAudit?.fresh
      ? {
          seo: latestAudit.scores.seo,
          aiVisibility: latestAudit.scores.aiVisibility,
          websiteHealth: latestAudit.scores.websiteHealth,
        }
      : null;

    if (metrics) {
      const { scores } = buildLiveTwinWithScores({
        organisationId: platformSession.organisationId,
        organisationName: platformSession.organisationName,
        enabledAppIds,
        metrics,
        connectors,
        profile,
        metricsContext: metricsContextFromLiveMetrics(metrics),
        presenceAuditOverride: presenceOverride,
        reputationOverride: reputationFromFeed.score,
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

  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

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
