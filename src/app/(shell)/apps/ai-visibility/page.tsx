import {
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  metricsContextFromLiveMetrics,
} from "@dg/platform-core";
import { currentUser } from "@clerk/nextjs/server";

import { AiVisibilityDashboard } from "@/components/ai-visibility/AiVisibilityDashboard";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";

export default async function AiVisibilityPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIds();

  let aiVisibilityScore = 72;
  let businessHealth = 87;
  const scoreBreakdown = [
    { id: "ai_visibility", label: "AI Visibility", value: aiVisibilityScore, href: "/apps/ai-visibility" },
    { id: "seo", label: "SEO", value: 68, href: "/apps/seo" },
    { id: "website", label: "Website Health", value: 74, href: "/apps/websites/health" },
    { id: "reputation", label: "Reputation", value: 80, href: "/apps/reviews" },
  ];
  const profileGaps: string[] = [];

  if (platformSession) {
    const [metrics, connectors, profile] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
      getOrganisationBusinessProfile(platformSession.organisationId),
    ]);

    if (metrics) {
      const { scores } = buildLiveTwinWithScores({
        organisationId: platformSession.organisationId,
        organisationName: platformSession.organisationName,
        enabledAppIds,
        metrics,
        connectors,
        profile,
        metricsContext: metricsContextFromLiveMetrics(metrics),
      });

      aiVisibilityScore = getScoreValue(scores.scores, "ai_visibility");
      businessHealth = scores.businessHealth;
      scoreBreakdown[0] = { ...scoreBreakdown[0], value: aiVisibilityScore };
      scoreBreakdown[1] = { ...scoreBreakdown[1], value: getScoreValue(scores.scores, "seo") };
      scoreBreakdown[2] = {
        ...scoreBreakdown[2],
        value: getScoreValue(scores.scores, "website_health"),
      };
      scoreBreakdown[3] = {
        ...scoreBreakdown[3],
        value: getScoreValue(scores.scores, "reputation"),
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
  }

  const user = await currentUser();
  const firstName = user?.firstName ?? "there";

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">AI Visibility Pro</h1>
        <p className="text-sm text-slate-400">
          Live scoring for {firstName}&apos;s discoverability in AI search and assistants
        </p>
      </header>
      <main className="flex-1 p-8">
        <AiVisibilityDashboard
          aiVisibilityScore={aiVisibilityScore}
          businessHealth={businessHealth}
          scoreBreakdown={scoreBreakdown}
          profileGaps={profileGaps}
        />
      </main>
    </>
  );
}
