import Link from "next/link";
import {
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  listOrgSeoAudits,
  metricsContextFromLiveMetrics,
} from "@dg/platform-core";

import { SeoSubnav } from "@/components/seo/SeoSubnav";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";

export default async function SeoOverviewPage() {
  const { session: platformSession } = await getPlatformPageContext();
  const enabledAppIds = await getOrgEnabledAppIds();

  let seoScore = 0;
  let websiteUrl: string | null = null;
  let lastAudit: Awaited<ReturnType<typeof listOrgSeoAudits>>[number] | null = null;

  if (platformSession) {
    const [metrics, connectors, profile, audits] = await Promise.all([
      gatherOverviewLiveMetrics(platformSession.organisationId),
      fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
      getOrganisationBusinessProfile(platformSession.organisationId),
      listOrgSeoAudits(platformSession.organisationId, 1),
    ]);

    websiteUrl = profile?.websiteUrl?.trim() ?? null;
    lastAudit = audits[0] ?? null;

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
      seoScore = getScoreValue(scores.scores, "seo");
    } else if (lastAudit?.metadata?.scores) {
      const auditScores = lastAudit.metadata.scores as { seo?: number };
      seoScore = auditScores.seo ?? 0;
    }
  }

  const lastScores = lastAudit?.metadata?.scores as
    | { seo?: number; websiteHealth?: number; aiVisibility?: number }
    | undefined;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">SEO</h1>
        <p className="text-sm text-slate-400">
          {platformSession?.organisationName ?? "DigitalGate"} · on-page and technical SEO scoring
        </p>
        <SeoSubnav active="/apps/seo" />
      </header>
      <main className="dg-page-main space-y-6">
        {!platformSession ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view SEO scores for your organisation.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Digital Twin SEO</p>
                <p className="mt-2 text-4xl font-bold text-white">{seoScore}</p>
                <p className="mt-1 text-xs text-slate-500">Profile-aware live score</p>
                <Link
                  href="/apps/ai-visibility"
                  className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                >
                  AI Visibility dashboard →
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Website URL</p>
                {websiteUrl ? (
                  <>
                    <p className="mt-2 truncate text-sm font-medium text-white">{websiteUrl}</p>
                    <Link
                      href="/dashboard/business"
                      className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                    >
                      Edit in Business Profile →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-amber-300">Not set</p>
                    <Link
                      href="/dashboard/business"
                      className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                    >
                      Add website URL →
                    </Link>
                  </>
                )}
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Last audit</p>
                {lastAudit ? (
                  <>
                    <p className="mt-2 text-4xl font-bold text-white">{lastScores?.seo ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(lastAudit.createdAt).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    <Link
                      href="/apps/seo/audit"
                      className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                    >
                      Run new audit →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-slate-400">No audits yet</p>
                    <Link
                      href="/apps/seo/audit"
                      className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                    >
                      Run first audit →
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="dg-card">
              <h2 className="font-semibold text-white">Quick links</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/apps/seo/audit" className="text-blue-400 hover:underline">
                    SEO page audit →
                  </Link>
                  <span className="ml-2 text-slate-500">Live probes + Studio checks</span>
                </li>
                <li>
                  <Link href="/apps/websites" className="text-blue-400 hover:underline">
                    Website Studio →
                  </Link>
                  <span className="ml-2 text-slate-500">Fix on-page SEO in native sites</span>
                </li>
                <li>
                  <Link href="/apps/websites/health" className="text-blue-400 hover:underline">
                    Website health centre →
                  </Link>
                  <span className="ml-2 text-slate-500">Publish, DNS, and performance</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </main>
    </>
  );
}
