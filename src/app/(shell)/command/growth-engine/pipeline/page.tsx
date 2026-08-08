import Link from "next/link";
import { growthPipelineStages, listGrowthProspects } from "@dg/platform-core";

import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";
import { ProspectStageSelect } from "@/components/command/ProspectStageSelect";

export default async function GrowthPipelinePage() {
  const stages = growthPipelineStages();
  const prospects = process.env.DATABASE_URL ? await listGrowthProspects() : [];

  const grouped = stages.map((stage) => ({
    stage,
    items: prospects.filter((p) => p.stage === stage),
  }));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-blue-400 hover:underline">
          ← Growth Engine
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Prospect Pipeline</h1>
        <p className="text-sm text-slate-400">
          {prospects.length} prospect{prospects.length === 1 ? "" : "s"} · auto-advances on report and engagement events
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <GrowthEngineNav active="/command/growth-engine/pipeline" />

        {!process.env.DATABASE_URL ? (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">Configure DATABASE_URL to use the prospect pipeline.</p>
          </div>
        ) : prospects.length === 0 ? (
          <div className="dg-card max-w-xl">
            <p className="text-slate-300">No prospects yet.</p>
            <Link
              href="/command/growth-engine/discovery"
              className="mt-3 inline-block text-sm text-blue-400 hover:underline"
            >
              Add your first prospect →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="py-2 pr-4 font-medium">Business</th>
                  <th className="py-2 pr-4 font-medium">Contact</th>
                  <th className="py-2 pr-4 font-medium">Industry / location</th>
                  <th className="py-2 font-medium">Stage</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((prospect) => (
                  <tr key={prospect.id} className="border-b border-slate-800/60">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{prospect.businessName}</p>
                      {prospect.websiteUrl ? (
                        <a
                          href={prospect.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          {prospect.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {[prospect.contactName, prospect.contactEmail, prospect.contactPhone]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-3 pr-4 text-slate-400">
                      {[prospect.industry, prospect.location].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="py-3">
                      <ProspectStageSelect
                        prospectId={prospect.id}
                        stage={prospect.stage}
                        stages={stages}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {prospects.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {grouped
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.stage} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{g.stage.replace(/_/g, " ")}</p>
                  <p className="mt-1 text-xl font-bold text-white">{g.items.length}</p>
                </div>
              ))}
          </div>
        ) : null}
      </main>
    </>
  );
}
