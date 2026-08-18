import Link from "next/link";
import { connection } from "next/server";
import {
  FOUNDING_STAGE_LABELS,
  FOUNDING_STAGE_NEXT_ACTION,
  FOUNDING_STAGES,
  listOpportunities,
  normaliseFoundingStage,
} from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { getPlatformPageContext } from "@/lib/org-apps";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CommandFoundingPage() {
  await connection();
  const { session } = await getPlatformPageContext();
  const { items } = session
    ? await listOpportunities({
        organisationId: session.organisationId,
        pipelineId: "founding_10",
        limit: 100,
      })
    : { items: [] };

  const grouped = FOUNDING_STAGES.map((stage) => ({
    stage,
    items: items.filter((item) => normaliseFoundingStage(item.stage) === stage),
  }));

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
          Founding 10
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Founding Customer pipeline</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Application qualifies. Onboarding configures. Every stage has a next action.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <CommandCentreNav active="founding" />
        <div className="grid gap-4 xl:grid-cols-3">
          {grouped.map(({ stage, items: rows }) => (
            <section key={stage} className="dg-card min-h-[10rem]">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-white">
                  {FOUNDING_STAGE_LABELS[stage]}
                </h2>
                <span className="text-xs text-slate-500">{rows.length}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {FOUNDING_STAGE_NEXT_ACTION[stage]}
              </p>
              <ul className="mt-3 space-y-2">
                {rows.length === 0 ? (
                  <li className="text-xs text-slate-600">None</li>
                ) : (
                  rows.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/apps/crm/opportunities/${row.id}`}
                        className="block rounded-lg border border-slate-800 px-3 py-2 text-sm text-slate-200 hover:border-sky-500/40"
                      >
                        {row.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
