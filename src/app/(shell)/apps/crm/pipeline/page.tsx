import Link from "next/link";
import { listOpportunities } from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function humanise(value: string | null | undefined, fallback: string) {
  return value?.trim() ? value.replace(/_/g, " ") : fallback;
}

export default async function CrmPipelinePage() {
  const session = await getAuthorisedPlatformPageSession("crm.opportunities.read");

  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Pipeline</h1>
          <p className="text-sm text-slate-400">CRM Core App</p>
        </header>
        <main className="dg-page-main">
          <div className="dg-card max-w-2xl">
            <p className="text-slate-300">Sign in to view the pipeline.</p>
          </div>
        </main>
      </>
    );
  }

  const { items, meta } = await listOpportunities({
    organisationId: session.organisationId,
    limit: 100,
  });

  const pipelineGroups = new Map<string, Map<string, typeof items>>();

  for (const opportunity of items) {
    const pipelineId = opportunity.pipelineId?.trim() || "unassigned";
    const stage = opportunity.stage?.trim() || "unassigned";
    const stages = pipelineGroups.get(pipelineId) ?? new Map<string, typeof items>();
    const stageItems = stages.get(stage) ?? [];
    stageItems.push(opportunity);
    stages.set(stage, stageItems);
    pipelineGroups.set(pipelineId, stages);
  }

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Pipeline</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · {meta.total} opportunit{meta.total === 1 ? "y" : "ies"}
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Opportunity pipeline</h2>
              <p className="mt-1 max-w-3xl text-sm text-slate-400">
                Pipeline is a workflow view of CRM Opportunities. Opportunities remain the canonical
                deal record; pipeline and stage organise how those records progress.
              </p>
            </div>
            <Link
              href="/apps/crm/opportunities"
              className="text-sm text-sky-400 hover:underline"
            >
              All opportunities →
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="dg-card">
            <p className="text-sm text-slate-500">No opportunities yet.</p>
          </div>
        ) : (
          Array.from(pipelineGroups.entries()).map(([pipelineId, stages]) => {
            const pipelineTotal = Array.from(stages.values()).reduce(
              (total, stageItems) => total + stageItems.length,
              0,
            );

            return (
              <section key={pipelineId} className="dg-card overflow-hidden">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Pipeline
                    </p>
                    <h2 className="text-lg font-semibold capitalize text-white">
                      {humanise(pipelineId, "Unassigned")}
                    </h2>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">
                    {pipelineTotal} {pipelineTotal === 1 ? "opportunity" : "opportunities"}
                  </span>
                </div>

                <div className="grid gap-4 xl:grid-cols-3">
                  {Array.from(stages.entries()).map(([stage, stageItems]) => (
                    <div
                      key={`${pipelineId}-${stage}`}
                      className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold capitalize text-slate-200">
                          {humanise(stage, "Unassigned")}
                        </h3>
                        <span className="text-xs tabular-nums text-slate-500">{stageItems.length}</span>
                      </div>
                      <div className="space-y-2">
                        {stageItems.map((opportunity) => (
                          <Link
                            key={opportunity.id}
                            href={`/apps/crm/opportunities/${opportunity.id}`}
                            className="block rounded-lg border border-slate-800 bg-slate-900/70 p-3 transition hover:border-slate-700 hover:bg-slate-900"
                          >
                            <p className="font-medium text-white">{opportunity.title}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                              <span className="capitalize">{opportunity.status}</span>
                              {opportunity.valueCents != null ? (
                                <span>
                                  {new Intl.NumberFormat("en-AU", {
                                    style: "currency",
                                    currency: opportunity.currency || "AUD",
                                    maximumFractionDigits: 0,
                                  }).format(opportunity.valueCents / 100)}
                                </span>
                              ) : null}
                              <span>
                                Updated {new Date(opportunity.updatedAt).toLocaleDateString("en-AU")}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}

        {meta.total > meta.limit ? (
          <div className="dg-card border-amber-500/30 bg-amber-500/5">
            <p className="text-sm text-amber-100">
              Showing the 100 most recently updated opportunities. Use Opportunities for the full
              record list while pipeline pagination is expanded.
            </p>
          </div>
        ) : null}
      </main>
    </>
  );
}
