import Link from "next/link";
import {
  buildLiveTwinWithScores,
  gatherOverviewLiveMetrics,
  getOrganisationBusinessProfile,
  getScoreValue,
  metricsContextFromLiveMetrics,
  scoresFromLatestSeoAudit,
} from "@dg/platform-core";

import { WebsiteSignalsPanel } from "@/components/seo/WebsiteSignalsPanel";
import type {
  WebsiteSignalFinding,
  WebsiteSignalProbes,
} from "@/components/seo/WebsiteSignalsPanel";
import { fetchOverviewConnectorProbes } from "@/lib/overview-connectors";
import { getOrgEnabledAppIds, getPlatformPageContext } from "@/lib/org-apps";

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

export default async function SeoOverviewPage() {
  let platformSession: Awaited<
    ReturnType<typeof getPlatformPageContext>
  >["session"] = null;
  let seoScore: number | null = null;
  let twinSeoProvisional = false;
  let aiVisibilityScore: number | null = null;
  let websiteUrl: string | null = null;
  let latestAudit: Awaited<ReturnType<typeof scoresFromLatestSeoAudit>> = null;
  let loadError: string | null = null;
  let probes: WebsiteSignalProbes | null = null;
  let findings: WebsiteSignalFinding[] = [];

  try {
    const ctx = await getPlatformPageContext();
    platformSession = ctx.session;
    const enabledAppIds = await getOrgEnabledAppIds();

    if (platformSession) {
      const [metricsResult, connectorsResult, profileResult, auditResult] =
        await Promise.allSettled([
          gatherOverviewLiveMetrics(platformSession.organisationId),
          fetchOverviewConnectorProbes(enabledAppIds, platformSession.organisationId),
          getOrganisationBusinessProfile(platformSession.organisationId),
          scoresFromLatestSeoAudit(platformSession.organisationId),
        ]);

      const metrics =
        metricsResult.status === "fulfilled" ? metricsResult.value : null;
      const connectors =
        connectorsResult.status === "fulfilled" ? connectorsResult.value : {};
      const profile =
        profileResult.status === "fulfilled" ? profileResult.value : null;
      const audit =
        auditResult.status === "fulfilled" ? auditResult.value : null;

      if (auditResult.status === "rejected") {
        console.error("[seo] audit failed", auditResult.reason);
      }

      latestAudit = audit;
      websiteUrl = audit?.websiteUrl ?? profile?.websiteUrl?.trim() ?? null;
      probes = toPlainProbes(audit?.probes ?? null);
      findings = toPlainFindings(audit?.findings ?? []);

      const presenceOverride = audit?.fresh
        ? {
            seo: audit.scores.seo,
            aiVisibility: audit.scores.aiVisibility,
            websiteHealth: audit.scores.websiteHealth,
          }
        : null;

      if (audit) {
        seoScore = audit.scores.seo;
        aiVisibilityScore = audit.scores.aiVisibility;
        twinSeoProvisional = !audit.fresh;
      } else if (metrics) {
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
          });
          seoScore = getScoreValue(scores.scores, "seo");
          aiVisibilityScore = getScoreValue(scores.scores, "ai_visibility");
          twinSeoProvisional = true;
        } catch (err) {
          console.error("[seo] twin scores failed", err);
        }
      }

      if (!websiteUrl && !audit) {
        seoScore = null;
        aiVisibilityScore = null;
      }
    }
  } catch (err) {
    console.error("[seo] page load failed", err);
    loadError = "We could not load SEO scores right now. You can still run an audit below.";
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">SEO</h1>
        <p className="text-sm text-slate-400">
          {platformSession?.organisationName ?? "DigitalGate"} · on-page and technical SEO from
          live HTML probes (+ Studio checks when available)
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {loadError ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {loadError}
          </p>
        ) : null}
        {!platformSession && !loadError ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">
              Sign in to view SEO scores for your organisation.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">SEO score</p>
                <p className="mt-2 text-4xl font-bold text-white">
                  {seoScore == null ? "—" : seoScore}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {latestAudit
                    ? twinSeoProvisional
                      ? "Last audit (re-scan recommended)"
                      : "From last presence audit"
                    : twinSeoProvisional
                      ? "Provisional Twin heuristic — run an audit"
                      : "Not scanned"}
                </p>
                <Link
                  href="/apps/seo/audit"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  {latestAudit ? "Run new audit →" : "Run first audit →"}
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">AI Visibility</p>
                <p className="mt-2 text-4xl font-bold text-white">
                  {aiVisibilityScore == null ? "—" : aiVisibilityScore}
                </p>
                <p className="mt-1 text-xs text-slate-500">Same audit source of truth</p>
                <Link
                  href="/apps/ai-visibility"
                  className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                >
                  AI Visibility dashboard →
                </Link>
              </div>
              <div className="dg-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">Website URL</p>
                {websiteUrl ? (
                  <>
                    <p className="mt-2 truncate text-sm font-medium text-white">{websiteUrl}</p>
                    {latestAudit?.auditedAt ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Audited{" "}
                        {new Date(latestAudit.auditedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    ) : null}
                    <Link
                      href="/dashboard/business"
                      className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                    >
                      Edit in Business Profile →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-amber-300">Not set</p>
                    <Link
                      href="/dashboard/business"
                      className="mt-3 inline-block text-xs text-sky-400 hover:underline"
                    >
                      Add website URL →
                    </Link>
                  </>
                )}
              </div>
            </div>

            <WebsiteSignalsPanel
              websiteUrl={websiteUrl}
              auditedAt={latestAudit?.auditedAt ?? null}
              probes={probes}
              findings={findings}
              scanLabel="Run SEO audit"
            />

            <div className="dg-card">
              <h2 className="font-semibold text-white">Quick links</h2>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/apps/seo/audit" className="text-sky-400 hover:underline">
                    SEO page audit →
                  </Link>
                  <span className="ml-2 text-slate-500">Live probes + Studio checks + history</span>
                </li>
                <li>
                  <Link href="/apps/websites" className="text-sky-400 hover:underline">
                    Website Studio →
                  </Link>
                  <span className="ml-2 text-slate-500">Fix on-page SEO in native sites</span>
                </li>
                <li>
                  <Link href="/apps/websites/health" className="text-sky-400 hover:underline">
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
