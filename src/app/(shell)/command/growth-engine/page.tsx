import Link from "next/link";
import { getGrowthEngineSummary } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import {
  GrowthEngineModuleGrid,
  GrowthEngineNav,
} from "@/components/command/GrowthEngineNav";

export default async function GrowthEngineHubPage() {
  const summary = process.env.DATABASE_URL ? await getGrowthEngineSummary() : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Growth Engine™</h1>
        <p className="text-sm text-slate-400">
          Discover → audit → report → pipeline → proposal → client — repeatable AI-powered acquisition
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="hub" />

        {summary ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Prospects</p>
              <p className="mt-1 text-3xl font-bold text-white">{summary.totalProspects}</p>
            </div>
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">Engagements (7d)</p>
              <p className="mt-1 text-3xl font-bold text-white">{summary.engagementsThisWeek}</p>
            </div>
            <div className="dg-card">
              <p className="text-xs uppercase tracking-wide text-slate-500">In pipeline</p>
              <p className="mt-1 text-3xl font-bold text-white">
                {summary.totalProspects -
                  (summary.byStage.won ?? 0) -
                  (summary.byStage.lost ?? 0)}
              </p>
            </div>
          </div>
        ) : (
          <div className="dg-card border-amber-500/30">
            <p className="text-amber-300">Set DATABASE_URL and run npm run db:push to enable Growth Engine.</p>
          </div>
        )}

        <GrowthEngineModuleGrid />
      </main>
    </>
  );
}
