import Link from "next/link";
import {
  PROSPECT_WORKSPACE_STAGES,
  computeProspectOpportunityScore,
  growthPipelineStages,
  listGrowthProspects,
  workspaceStageForProspectStage,
} from "@dg/platform-core";

import { EditProspectForm } from "@/components/command/EditProspectForm";
import {
  ArchiveProspectButton,
  ConvertProspectToOrgButton,
  RunProspectAuditButton,
} from "@/components/command/GrowthEngineActions";
import { ProspectStageSelect } from "@/components/command/ProspectStageSelect";

const CONVERT_STAGES = new Set(["proposal_sent", "won", "onboarding"]);

const STAGES = growthPipelineStages();

function relativeTime(iso: string) {
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function bandEmoji(band: string) {
  if (band === "very_high" || band === "high") return "🔥";
  if (band === "medium") return "⚡";
  return "·";
}

type AuditLite = {
  prospectId: string;
  businessHealth: number | null;
  aiVisibility: number | null;
  seoScore: number | null;
  websiteHealth: number | null;
};

export async function ProspectingPipelineSurface({
  organisationId,
  showArchived,
  variant,
}: {
  organisationId: string;
  showArchived: boolean;
  variant: "apps" | "command";
}) {
  const discoveryHref = "/apps/prospecting/discovery";
  const scoresHref = "/apps/prospecting/scores";
  const pipelinePath =
    variant === "apps" ? "/apps/prospecting/pipeline" : "/command/growth-engine/pipeline";
  const hubHref = variant === "apps" ? "/apps/prospecting" : "/command/growth-engine";
  const hubLabel = "Growth Engine™";

  const prospects = process.env.DATABASE_URL
    ? await listGrowthProspects({
        organisationId,
        limit: 200,
        ...(showArchived ? { archivedOnly: true } : {}),
      })
    : [];

  const auditsByProspect = new Map<string, AuditLite>();
  if (process.env.DATABASE_URL && prospects.length > 0) {
    const { prisma } = await import("@dg/database");
    const ids = prospects.map((p) => p.id);
    const audits = await prisma.growthProspectAudit.findMany({
      where: { prospectId: { in: ids } },
      orderBy: { auditedAt: "desc" },
      take: 400,
      select: {
        prospectId: true,
        businessHealth: true,
        aiVisibility: true,
        seoScore: true,
        websiteHealth: true,
      },
    });
    for (const a of audits) {
      if (auditsByProspect.has(a.prospectId)) continue;
      auditsByProspect.set(a.prospectId, a);
    }
  }

  const enriched = prospects.map((prospect) => {
    const audit = auditsByProspect.get(prospect.id) ?? null;
    const score = computeProspectOpportunityScore({
      stage: prospect.stage,
      updatedAt: new Date(prospect.updatedAt),
      websiteUrl: prospect.websiteUrl,
      contactPhone: prospect.contactPhone,
      contactEmail: prospect.contactEmail,
      industry: prospect.industry,
      metadata: prospect.metadata,
      audit: audit
        ? {
            businessHealth: audit.businessHealth,
            aiVisibility: audit.aiVisibility,
            seoScore: audit.seoScore,
            websiteHealth: audit.websiteHealth,
          }
        : null,
    });
    const workspaceStage = workspaceStageForProspectStage(prospect.stage);
    return { prospect, score, workspaceStage, audit };
  });

  const stageRows = PROSPECT_WORKSPACE_STAGES.map((stage) => {
    const items = enriched.filter((e) => e.workspaceStage === stage.id);
    const scored = items.filter((i) => i.score.score > 0);
    const avgScore =
      scored.length > 0
        ? Math.round(scored.reduce((sum, i) => sum + i.score.score, 0) / scored.length)
        : null;
    const requiringAction = items.filter(
      (i) =>
        i.score.recommendedAction === "call_today" ||
        i.score.recommendedAction === "call_and_email" ||
        i.score.recommendedAction === "run_audit" ||
        i.score.recommendedAction === "follow_up",
    ).length;
    return { stage, items, avgScore, requiringAction };
  });

  const activeCount = prospects.length;

  return (
    <>
      <header className="dg-page-header">
        <Link href={hubHref} className="text-sm text-sky-400 hover:underline">
          ← {hubLabel}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Prospect Pipeline</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Manage businesses from initial discovery through qualification and conversion into CRM.
        </p>
        <p className="mt-3 text-lg font-semibold text-white">
          {activeCount} {showArchived ? "archived" : "active"} prospect
          {activeCount === 1 ? "" : "s"}
        </p>
        <p className="mt-2 text-xs">
          {showArchived ? (
            <Link href={pipelinePath} className="text-sky-400 hover:underline">
              ← Hide archived
            </Link>
          ) : (
            <Link
              href={`${pipelinePath}?archived=1`}
              className="text-slate-500 hover:text-sky-400 hover:underline"
            >
              Show archived
            </Link>
          )}
          {" · "}
          <Link href={discoveryHref} className="text-sky-400 hover:underline">
            Discovery
          </Link>
          {" · "}
          <Link href={scoresHref} className="text-sky-400 hover:underline">
            Opportunity Scoring
          </Link>
        </p>
      </header>

      <main className="dg-page-main space-y-8">
        {!process.env.DATABASE_URL ? (
          <p className="text-sm text-amber-200">DATABASE_URL required for pipeline.</p>
        ) : (
          <>
            {/* Compact stage strip — always present */}
            <section className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
                Pipeline
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {PROSPECT_WORKSPACE_STAGES.map((s, i) => (
                  <span key={s.id} className="inline-flex items-center gap-1.5">
                    {i > 0 ? <span className="text-slate-600">→</span> : null}
                    <span className="text-slate-300">{s.label}</span>
                  </span>
                ))}
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-3 font-medium">Stage</th>
                      <th className="pb-2 pr-3 font-medium">Prospects</th>
                      <th className="pb-2 pr-3 font-medium">Avg score</th>
                      <th className="pb-2 pr-3 font-medium">Need action</th>
                      <th className="pb-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageRows.map(({ stage, items, avgScore, requiringAction }) => (
                      <tr key={stage.id} className="border-b border-slate-800/60">
                        <td className="py-2.5 pr-3 text-slate-200">{stage.label}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-white">{items.length}</td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-400">
                          {avgScore != null ? avgScore : "—"}
                        </td>
                        <td className="py-2.5 pr-3 tabular-nums text-slate-400">
                          {requiringAction > 0 ? requiringAction : "—"}
                        </td>
                        <td className="py-2.5">
                          <a
                            href={`#stage-${stage.id}`}
                            className="text-sky-400 hover:underline"
                          >
                            {stage.actionLabel}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Opportunity value columns land when commercial estimates are attributed per prospect.
                Avg Opportunity Score™ uses live audit signals when available.
              </p>
            </section>

            {activeCount === 0 && !showArchived ? (
              <section className="rounded-xl border border-dashed border-slate-700 bg-slate-950/30 px-6 py-10 text-center">
                <p className="text-lg font-semibold text-white">Your prospect pipeline is empty.</p>
                <p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">
                  Run Business Discovery to find potential customers, or add a prospect.
                </p>
                <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                  DigitalGate keeps prospects separate from your CRM until they&apos;re qualified and
                  converted.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href={discoveryHref}
                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                  >
                    Discover businesses
                  </Link>
                  <Link
                    href={`${discoveryHref}#add-prospect`}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-400"
                  >
                    Add prospect
                  </Link>
                </div>
                <p className="mt-4">
                  <a href="#how-pipeline-works" className="text-sm text-sky-400 hover:underline">
                    How the Prospect Pipeline works →
                  </a>
                </p>
              </section>
            ) : null}

            {/* Board */}
            {activeCount > 0 || showArchived ? (
              <div className="flex gap-3 overflow-x-auto pb-4">
                {stageRows.map(({ stage, items }) => (
                  <section
                    id={`stage-${stage.id}`}
                    key={stage.id}
                    className="w-72 shrink-0 rounded-xl border border-slate-800 bg-slate-950/40"
                  >
                    <header className="border-b border-slate-800 px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {stage.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {items.length} · {stage.actionLabel}
                      </p>
                    </header>
                    <ul className="space-y-2 p-2 min-h-[4rem]">
                      {items.length === 0 ? (
                        <li className="px-2 py-3 text-xs text-slate-600">{stage.description}</li>
                      ) : (
                        items.map(({ prospect, score }) => (
                          <li
                            key={prospect.id}
                            className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3"
                          >
                            <p className="text-sm font-medium text-white">
                              {prospect.businessName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {[prospect.location, prospect.industry].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>

                            <div className="mt-2 flex flex-wrap items-baseline gap-2">
                              <span className="text-sm font-semibold text-sky-300">
                                Opportunity Score™ {score.score}
                              </span>
                              <span className="text-xs text-amber-200/90">
                                {bandEmoji(score.band)} {score.bandLabel} opportunity
                              </span>
                            </div>

                            {score.reasons.length > 0 ? (
                              <p className="mt-2 text-xs text-slate-400">
                                <span className="text-slate-500">Why:</span>{" "}
                                {score.reasons.slice(0, 3).join(" · ")}
                              </p>
                            ) : null}

                            <p className="mt-2 text-xs text-slate-300">
                              <span className="text-slate-500">Next action:</span>{" "}
                              {score.recommendedActionLabel}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-600">
                              Last activity: {relativeTime(prospect.updatedAt)}
                            </p>

                            {!showArchived ? (
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <Link
                                  href={scoresHref}
                                  className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:border-slate-500"
                                >
                                  View
                                </Link>
                                {prospect.contactPhone || prospect.contactEmail ? (
                                  <a
                                    href={
                                      prospect.contactPhone
                                        ? `tel:${prospect.contactPhone}`
                                        : `mailto:${prospect.contactEmail}`
                                    }
                                    className="rounded-md border border-emerald-700/50 px-2 py-1 text-[11px] text-emerald-300 hover:border-emerald-500"
                                  >
                                    Contact
                                  </a>
                                ) : (
                                  <RunProspectAuditButton
                                    prospectId={prospect.id}
                                    label="Enrich"
                                  />
                                )}
                                <ProspectStageSelect
                                  prospectId={prospect.id}
                                  stage={prospect.stage}
                                  stages={STAGES}
                                />
                                <EditProspectForm prospect={prospect} />
                                {CONVERT_STAGES.has(prospect.stage) ? (
                                  <ConvertProspectToOrgButton prospectId={prospect.id} />
                                ) : null}
                                <ArchiveProspectButton
                                  prospectId={prospect.id}
                                  businessName={prospect.businessName}
                                  archived={false}
                                />
                              </div>
                            ) : (
                              <div className="mt-2">
                                <ArchiveProspectButton
                                  prospectId={prospect.id}
                                  businessName={prospect.businessName}
                                  archived
                                />
                              </div>
                            )}
                          </li>
                        ))
                      )}
                    </ul>
                  </section>
                ))}
              </div>
            ) : (
              /* Empty: still show skeleton columns so the framework is visible */
              <div className="flex gap-3 overflow-x-auto pb-4 opacity-70">
                {PROSPECT_WORKSPACE_STAGES.map((stage) => (
                  <section
                    id={`stage-${stage.id}`}
                    key={stage.id}
                    className="w-64 shrink-0 rounded-xl border border-dashed border-slate-800 bg-slate-950/20"
                  >
                    <header className="border-b border-slate-800/80 px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {stage.label}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">0 · {stage.actionLabel}</p>
                    </header>
                    <p className="px-3 py-4 text-xs text-slate-600">{stage.description}</p>
                  </section>
                ))}
              </div>
            )}

            <section
              id="how-pipeline-works"
              className="rounded-xl border border-slate-800 bg-slate-950/30 px-5 py-5"
            >
              <h2 className="text-sm font-semibold text-white">How the Prospect Pipeline works</h2>
              <ol className="mt-3 space-y-2 text-sm text-slate-400">
                <li>
                  <span className="text-slate-200">Discovery</span> — Find businesses.
                </li>
                <li>
                  <span className="text-slate-200">Prospect Pipeline</span> — Manage and qualify
                  them.
                </li>
                <li>
                  <span className="text-slate-200">Opportunity Score™</span> — Determine which ones
                  matter.
                </li>
                <li>
                  <span className="text-slate-200">CRM</span> — Convert qualified prospects into
                  relationships.
                </li>
                <li>
                  <span className="text-slate-200">Opportunity</span> — Manage the commercial
                  opportunity.
                </li>
                <li>
                  <span className="text-slate-200">Automation</span> — Follow up and progress it.
                </li>
              </ol>
              <p className="mt-3 text-xs text-slate-500">
                Prospect ≠ CRM Company. The pipeline keeps scraped and researched businesses out of
                CRM until you convert.
              </p>
            </section>
          </>
        )}
      </main>
    </>
  );
}
