import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listGrowthProspectAudits,
  organisationGrowthScope,
  listProspectsNeedingAudit,
} from "@dg/platform-core";

import {
  GenerateProspectReportButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { getPlatformPageContext } from "@/lib/platform-page-context";

function findingCount(findings: unknown) {
  if (!findings || typeof findings !== "object") return 0;
  const items = (findings as { items?: unknown[] }).items;
  return Array.isArray(items) ? items.length : 0;
}

export default async function GrowthAuditsPage() {
  const db = Boolean(process.env.DATABASE_URL);
  const { session } = await getPlatformPageContext();
  const [audits, needsAudit] = db && session?.organisationId
    ? await Promise.all([
        listGrowthProspectAudits(
          organisationGrowthScope(session.organisationId),
        ),
        listProspectsNeedingAudit({ organisationId: session.organisationId }),
      ])
    : [[], []];

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Prospecting
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">AI Audit Engine™</h1>
        <p className="mt-1 text-sm text-slate-400">
          Live website presence probes — scores from reachable HTML signals, not invented metrics.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!db ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Configure DATABASE_URL to run prospect audits.
          </div>
        ) : (
          <>
            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Needs audit</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Prospects without a stored audit yet.
                  </p>
                </div>
                <Link
                  href="/apps/prospecting/discovery"
                  className="text-sm text-sky-400 hover:underline"
                >
                  Add prospect →
                </Link>
              </div>
              {needsAudit.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  All current prospects have an audit, or the pipeline is empty.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {needsAudit.map((prospect) => (
                    <li
                      key={prospect.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">{prospect.businessName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {[prospect.industry, prospect.location, prospect.websiteUrl]
                            .filter(Boolean)
                            .join(" · ") || "No website or location yet"}
                        </p>
                      </div>
                      <RunProspectAuditButton prospectId={prospect.id} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-white">Recent audits</h2>
              <p className="mt-1 text-sm text-slate-400">
                Newest first — generate an opportunity report when ready.
              </p>
              {audits.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No audits yet. Run one above.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {audits.map((audit) => (
                    <article
                      key={audit.id}
                      className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-white">
                            {audit.prospect.businessName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {GROWTH_ENGINE_STAGE_LABELS[audit.prospect.stage] ??
                              audit.prospect.stage}{" "}
                            · {new Date(audit.auditedAt).toLocaleString("en-AU")} ·{" "}
                            {findingCount(audit.findings)} findings · {audit.auditVersion}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <RunProspectAuditButton
                            prospectId={audit.prospectId}
                            label="Re-run"
                          />
                          <GenerateProspectReportButton
                            prospectId={audit.prospectId}
                            auditId={audit.id}
                            markSent
                          />
                          <GenerateProspectReportButton
                            prospectId={audit.prospectId}
                            auditId={audit.id}
                            label="Draft only"
                          />
                        </div>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-4">
                        <ScoreChip label="Business Health" value={audit.businessHealth} />
                        <ScoreChip label="Website" value={audit.websiteHealth} />
                        <ScoreChip label="SEO" value={audit.seoScore} />
                        <ScoreChip label="AI Visibility" value={audit.aiVisibility} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}

function ScoreChip({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-white">{value ?? "—"}</p>
    </div>
  );
}
