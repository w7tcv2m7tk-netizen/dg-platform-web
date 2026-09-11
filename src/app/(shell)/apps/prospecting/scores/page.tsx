import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listGrowthProspectAudits,
  organisationGrowthScope,
  sessionHasFeature,
} from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function compositeScore(audit: {
  businessHealth: number | null;
  aiVisibility: number | null;
  seoScore: number | null;
  websiteHealth: number | null;
}) {
  const scores = [
    audit.businessHealth,
    audit.aiVisibility,
    audit.seoScore,
    audit.websiteHealth,
  ].filter((value): value is number => typeof value === "number");
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

function priorityLabel(score: number | null) {
  if (score == null) return "Needs evidence";
  if (score >= 75) return "High opportunity";
  if (score >= 50) return "Review opportunity";
  return "Nurture";
}

export default async function ProspectingScoresPage() {
  const session = await getAuthorisedPlatformPageSession("prospecting.prospects.read");
  if (!session) notFound();

  const canDiscover = sessionHasFeature(session, "prospecting.prospects.write");
  let audits: Awaited<ReturnType<typeof listGrowthProspectAudits>> = [];
  let loadFailed = false;

  if (process.env.DATABASE_URL) {
    try {
      audits = await listGrowthProspectAudits(
        organisationGrowthScope(session.organisationId),
        { limit: 100 },
      );
    } catch (error) {
      console.error("[prospecting/opportunities] load failed", error);
      loadFailed = true;
    }
  } else {
    loadFailed = true;
  }

  const latestByProspect = new Map<string, (typeof audits)[number]>();
  for (const audit of audits) {
    if (!latestByProspect.has(audit.prospectId)) {
      latestByProspect.set(audit.prospectId, audit);
    }
  }

  const opportunities = Array.from(latestByProspect.values())
    .map((audit) => ({ audit, score: compositeScore(audit) }))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <>
      <header className="dg-page-header">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">
          Opportunity evidence
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Opportunities</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Prioritise audited prospects using the business, AI visibility, SEO and website evidence DigitalGate has actually collected.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {loadFailed ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
            Opportunity evidence is temporarily unavailable. Try again shortly.
          </div>
        ) : opportunities.length === 0 ? (
          <div className="dg-card space-y-3">
            <h2 className="font-semibold text-white">No audited opportunities yet</h2>
            <p className="text-sm text-slate-400">
              Opportunity evidence appears after prospects are discovered and audited. DigitalGate will rank real signals here rather than showing illustrative scores.
            </p>
            {canDiscover ? (
              <Link href="/apps/prospecting/discovery" className="text-sm text-sky-400 hover:underline">
                Open Discovery →
              </Link>
            ) : (
              <Link href="/apps/prospecting/prospects" className="text-sm text-sky-400 hover:underline">
                View Prospects →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map(({ audit, score }, index) => (
              <article key={audit.prospectId} className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      #{index + 1} · {priorityLabel(score)}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-white">{audit.prospect.businessName}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {[audit.prospect.industry, audit.prospect.location].filter(Boolean).join(" · ") || "Prospect details still being enriched"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-white">{score == null ? "—" : score}</p>
                    <p className="text-xs text-slate-500">evidence average / 100</p>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Business health", audit.businessHealth],
                    ["AI visibility", audit.aiVisibility],
                    ["SEO", audit.seoScore],
                    ["Website health", audit.websiteHealth],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-3">
                      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold text-slate-100">
                        {typeof value === "number" ? value : "—"}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                  <p className="text-slate-500">
                    Latest audit {new Date(audit.auditedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <Link href="/apps/prospecting/pipeline" className="text-sky-400 hover:underline">
                    Continue in Pipeline →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
