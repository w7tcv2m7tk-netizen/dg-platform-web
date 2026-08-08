import Link from "next/link";
import {
  GROWTH_ENGINE_STAGE_LABELS,
  listGrowthProspects,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { CreateProspectForm } from "@/components/command/CreateProspectForm";
import { RunProspectAuditButton } from "@/components/command/GrowthEngineActions";
import { GrowthEngineNav } from "@/components/command/GrowthEngineNav";

interface PageProps {
  searchParams: Promise<{ q?: string; industry?: string; location?: string }>;
}

export default async function GrowthDiscoveryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const industry = (params.industry ?? "").trim().toLowerCase();
  const location = (params.location ?? "").trim().toLowerCase();

  const all = process.env.DATABASE_URL ? await listGrowthProspects({ limit: 200 }) : [];
  const filtered = all.filter((p) => {
    if (q) {
      const hay = `${p.businessName} ${p.contactName ?? ""} ${p.websiteUrl ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (industry && !(p.industry ?? "").toLowerCase().includes(industry)) return false;
    if (location && !(p.location ?? "").toLowerCase().includes(location)) return false;
    return true;
  });

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/growth-engine" className="text-sm text-sky-400 hover:underline">
          ← Growth Engine
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Business Discovery</h1>
        <p className="mt-1 text-sm text-slate-400">
          Add prospects and filter the book. Automated search / GBP crawl is still GE-2.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="growth" />
        <GrowthEngineNav active="/command/growth-engine/discovery" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5">
            <h2 className="font-semibold text-white">Add prospect</h2>
            <p className="mt-1 text-sm text-slate-400">
              Creates a pipeline record automatically — no manual CRM entry.
            </p>
            <div className="mt-4">
              <CreateProspectForm />
            </div>
          </div>

          <div className="space-y-4">
            <form className="grid gap-3 sm:grid-cols-3" method="get">
              <label className="block text-sm">
                <span className="text-slate-400">Search</span>
                <input
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="Name or site"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Industry</span>
                <input
                  name="industry"
                  defaultValue={params.industry ?? ""}
                  placeholder="Real estate"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-400">Location</span>
                <input
                  name="location"
                  defaultValue={params.location ?? ""}
                  placeholder="Gold Coast"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                />
              </label>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
                >
                  Filter
                </button>
              </div>
            </form>

            {!process.env.DATABASE_URL ? (
              <p className="text-sm text-amber-200">DATABASE_URL required to list prospects.</p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">
                {all.length === 0
                  ? "No prospects yet — add one on the left."
                  : "No prospects match these filters."}
              </p>
            ) : (
              <ul className="space-y-2">
                {filtered.map((prospect) => (
                  <li
                    key={prospect.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/80 bg-slate-950/40 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-white">{prospect.businessName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {GROWTH_ENGINE_STAGE_LABELS[prospect.stage] ?? prospect.stage}
                        {[prospect.industry, prospect.location]
                          .filter(Boolean)
                          .map((v) => ` · ${v}`)
                          .join("")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/command/growth-engine/pipeline"
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Pipeline
                      </Link>
                      <RunProspectAuditButton prospectId={prospect.id} label="Audit" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
