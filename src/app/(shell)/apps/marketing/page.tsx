import Link from "next/link";
import {
  buildGrowthOpportunities,
  buildLiveTwinWithScores,
  buildSetupProgress,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getPlatformSetupStatus,
  getScoreValue,
  metricsContextFromLiveMetrics,
} from "@dg/platform-core";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";

export default async function MarketingOverviewPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIds();

  let twinScores = {
    seo: 0,
    aiVisibility: 0,
    websiteHealth: 0,
    businessGrowth: 0,
    businessHealth: 0,
  };
  let opportunities: ReturnType<typeof buildGrowthOpportunities> = { items: [], totalCount: 0 };

  if (platformSession) {
    const [metrics, connectors, profile, setupStatus] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
      getOrganisationBusinessProfile(platformSession.organisationId),
      getPlatformSetupStatus(platformSession.organisationId),
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

      twinScores = {
        seo: getScoreValue(scores.scores, "seo"),
        aiVisibility: getScoreValue(scores.scores, "ai_visibility"),
        websiteHealth: getScoreValue(scores.scores, "website_health"),
        businessGrowth: getScoreValue(scores.scores, "business_growth"),
        businessHealth: scores.businessHealth,
      };

      const setupProgress = buildSetupProgress({
        setupStatus,
        businessProfile: profile,
        connectorProbes: connectors,
        enabledAppIds,
        hasSession: true,
      });

      opportunities = buildGrowthOpportunities({
        enabledAppIds,
        scores: scores.scores,
        businessProfile: profile,
        connectorProbes: connectors,
        setupPercent: setupProgress.percent,
      });
    }
  }

  const scoreCards = [
    { id: "seo", label: "SEO", value: twinScores.seo, href: "/apps/seo" },
    { id: "ai_visibility", label: "AI Visibility", value: twinScores.aiVisibility, href: "/apps/ai-visibility" },
    { id: "website", label: "Website", value: twinScores.websiteHealth, href: "/apps/websites/health" },
    { id: "growth", label: "Business Growth", value: twinScores.businessGrowth, href: "/apps/marketing/campaigns" },
  ];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
          ← Overview
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Marketing</h1>
        <p className="text-sm text-slate-400">
          Twin scores and growth opportunities for {platformSession?.organisationName ?? "your business"}
        </p>
        <MarketingSubnav active="/apps/marketing" />
      </header>
      <main className="dg-page-main space-y-6">
        <section className="dg-card">
          <p className="text-xs uppercase tracking-wide text-slate-500">Business Health</p>
          <p className="mt-1 text-3xl font-bold text-emerald-400">{twinScores.businessHealth}/100</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scoreCards.map((card) => (
              <Link
                key={card.id}
                href={card.href}
                className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 hover:border-slate-700"
              >
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-white">{card.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="dg-card" id="growth-opportunities">
          <h2 className="font-semibold text-white">
            Growth opportunities
            {opportunities.totalCount > 0 ? (
              <span className="ml-2 text-sm font-normal text-slate-500">
                ({opportunities.totalCount})
              </span>
            ) : null}
          </h2>
          {opportunities.items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No opportunities identified yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {opportunities.items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{item.label}</p>
                    <p className="text-xs text-slate-500">
                      {item.status} · {item.impact}
                    </p>
                  </div>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="shrink-0 text-sm text-blue-400 hover:underline"
                    >
                      Open →
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
