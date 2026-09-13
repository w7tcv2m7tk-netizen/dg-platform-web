import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCurrentSeoSnapshot,
  getSeoTrendSnapshot,
} from "@dg/platform-core";

import { ResolutionAction, ResolutionFallback } from "@/components/ui/ResolutionAction";
import { getPlatformPageContext } from "@/lib/org-apps";

const SECTIONS = new Set(["trends", "opportunities", "monitoring"]);

function formatDate(value: string | null | undefined) {
  if (!value) return "Unavailable";
  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Australia/Brisbane",
  }).format(new Date(value));
}

function ScoreCard({ label, value, delta }: { label: string; value: number | null; delta?: number | null }) {
  const deltaLabel = delta == null ? "More history needed" : `${delta > 0 ? "+" : ""}${delta} since previous audit`;
  return (
    <div className="dg-card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-bold text-white">{value == null ? "—" : value}</p>
      {delta !== undefined ? (
        <p className={`mt-1 text-xs ${delta != null && delta < 0 ? "text-amber-300" : "text-slate-500"}`}>{deltaLabel}</p>
      ) : null}
    </div>
  );
}

function resolutionFor(title: string, recommendedAction?: string) {
  const value = `${title} ${recommendedAction ?? ""}`.toLowerCase();
  if (value.includes("business profile") || value.includes("contact") || value.includes("location")) {
    return { href: "/dashboard/business", label: "Fix business details" };
  }
  if (value.includes("studio") || value.includes("publish")) {
    return { href: "/apps/websites", label: "Fix in Website Studio" };
  }
  if (
    value.includes("title") ||
    value.includes("meta") ||
    value.includes("open graph") ||
    value.includes("schema") ||
    value.includes("json-ld") ||
    value.includes("h1")
  ) {
    return { href: "/apps/seo", label: "Open SEO fixes" };
  }
  return null;
}

export default async function SeoSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!SECTIONS.has(section)) notFound();

  const { session } = await getPlatformPageContext();
  if (!session) {
    return (
      <main className="dg-page-main">
        <div className="dg-card"><p className="text-sm text-slate-400">Sign in to view SEO intelligence.</p></div>
      </main>
    );
  }

  const [current, trend] = await Promise.all([
    getCurrentSeoSnapshot(session.organisationId),
    getSeoTrendSnapshot(session.organisationId),
  ]);

  if (section === "trends") {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">SEO trends</h1>
          <p className="text-sm text-slate-400">{session.organisationName} · comparable persisted audit evidence only</p>
        </header>
        <main className="dg-page-main space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <ScoreCard label="SEO" value={trend.current?.scores.seo ?? null} delta={trend.seoDelta} />
            <ScoreCard label="Website health" value={trend.current?.scores.websiteHealth ?? null} delta={trend.websiteHealthDelta} />
            <ScoreCard label="Native SEO" value={trend.current?.scores.nativeSeo ?? null} delta={trend.nativeSeoDelta} />
          </div>
          <div className="dg-card">
            <h2 className="font-semibold text-white">Evidence comparison</h2>
            <p className="mt-2 text-sm text-slate-400">
              Latest audit: {formatDate(trend.current?.auditedAt)}{trend.current?.hostname ? ` · ${trend.current.hostname}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Previous comparable audit: {formatDate(trend.previous?.auditedAt)}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              DigitalGate compares the latest audit only with an earlier audit for the same hostname. Missing history remains unavailable rather than being treated as zero.
            </p>
            <ResolutionAction href="/apps/seo/audit" label="Run fresh audit" className="mt-4" />
          </div>
        </main>
      </>
    );
  }

  if (section === "opportunities") {
    const findings = current.latest?.findings ?? [];
    const ranked = [...findings].sort((a, b) => {
      const rank = (severity: string) => severity === "warning" ? 0 : severity === "opportunity" ? 1 : 2;
      return rank(a.severity) - rank(b.severity);
    });

    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">SEO opportunities</h1>
          <p className="text-sm text-slate-400">{session.organisationName} · prioritised from the latest persisted website evidence</p>
        </header>
        <main className="dg-page-main space-y-4">
          {!current.latest ? (
            <div className="dg-card">
              <h2 className="font-semibold text-white">No audit evidence yet</h2>
              <p className="mt-2 text-sm text-slate-400">Run an SEO audit before DigitalGate recommends changes.</p>
              <ResolutionAction href="/apps/seo/audit" label="Run first audit" className="mt-4" />
            </div>
          ) : ranked.length === 0 ? (
            <div className="dg-card">
              <h2 className="font-semibold text-emerald-300">No unresolved findings in the latest audit</h2>
              <p className="mt-2 text-sm text-slate-400">This reflects the latest stored audit only. Run a fresh audit to verify the current website.</p>
              <ResolutionAction href="/apps/seo/audit" label="Verify with new audit" className="mt-4" />
            </div>
          ) : (
            ranked.map((finding, index) => {
              const resolution = resolutionFor(finding.title, finding.recommendedAction);
              return (
                <div key={`${finding.title}-${index}`} className="dg-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-500">{finding.severity}</p>
                      <h2 className="mt-1 font-semibold text-white">{finding.title}</h2>
                      {finding.detail ? <p className="mt-2 text-sm text-slate-400">{finding.detail}</p> : null}
                      {finding.recommendedAction ? <p className="mt-2 text-xs text-slate-500">Recommended: {finding.recommendedAction}</p> : null}
                    </div>
                    {resolution ? (
                      <ResolutionAction href={resolution.href} label={resolution.label} />
                    ) : (
                      <ResolutionFallback />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </main>
      </>
    );
  }

  const lastAudit = current.latest?.auditedAt ?? null;
  const status = !current.latest ? "Not monitored" : current.fresh ? "Current" : "Needs refresh";
  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">SEO monitoring</h1>
        <p className="text-sm text-slate-400">{session.organisationName} · evidence freshness and monitoring controls</p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Evidence status</p>
            <p className="mt-2 text-2xl font-semibold text-white">{status}</p>
            <p className="mt-1 text-xs text-slate-500">{current.ageDays == null ? "No audit recorded" : `${current.ageDays} day${current.ageDays === 1 ? "" : "s"} old`}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Last audit</p>
            <p className="mt-2 text-sm font-medium text-white">{formatDate(lastAudit)}</p>
            <p className="mt-1 text-xs text-slate-500">{current.latest?.hostname ?? "No hostname"}</p>
          </div>
          <div className="dg-card">
            <p className="text-xs uppercase tracking-wide text-slate-500">Evidence history</p>
            <p className="mt-2 text-4xl font-bold text-white">{current.auditCount}</p>
            <p className="mt-1 text-xs text-slate-500">Persisted SEO audits</p>
          </div>
        </div>
        <div className="dg-card">
          <h2 className="font-semibold text-white">Run and verify</h2>
          <p className="mt-2 text-sm text-slate-400">
            SEO scores and opportunities are refreshed from live website evidence. DigitalGate does not infer a current score from stale or unrelated domains.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ResolutionAction href="/apps/seo/audit" label="Run SEO audit" />
            <Link href="/apps/seo/opportunities" className="inline-flex items-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500">Review opportunities →</Link>
          </div>
        </div>
      </main>
    </>
  );
}
