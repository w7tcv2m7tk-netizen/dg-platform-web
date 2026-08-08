import Link from "next/link";
import { getClientExpansionOpportunities } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function CommandOpportunitiesPage() {
  const data = process.env.DATABASE_URL
    ? await getClientExpansionOpportunities()
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Client expansion</h1>
        <p className="mt-1 text-sm text-slate-400">
          Opportunity Engine — evidence-based upsells from installed Apps and Twin gaps.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="opportunities" />

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — opportunities unavailable.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5">
              <p className="text-xs uppercase tracking-wide text-sky-400">
                Potential additional MRR
              </p>
              <p className="mt-1 text-3xl font-semibold text-white">
                {data.totalPotentialMrrLabel}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Across {data.summaries.length} client
                {data.summaries.length === 1 ? "" : "s"} with expansion signals.
              </p>
            </div>

            <section className="space-y-4">
              {data.summaries.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No expansion opportunities right now — clients look fully covered.
                </p>
              ) : (
                data.summaries.map((summary) => (
                  <article
                    key={summary.organisationId}
                    className="rounded-xl border border-slate-700/80 bg-slate-950/40 px-5 py-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-white">
                          {summary.organisationName}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          Potential {formatAud(summary.totalPotentialMrrCents)}/mo
                        </p>
                      </div>
                      <Link
                        href={`/command/advisor?org=${summary.organisationId}`}
                        className="text-sm text-sky-400 hover:underline"
                      >
                        Advise →
                      </Link>
                    </div>
                    <ul className="mt-4 space-y-3">
                      {summary.opportunities.map((opp) => (
                        <li
                          key={`${opp.appId}-${opp.label}`}
                          className="flex items-start justify-between gap-4 border-b border-slate-800/70 pb-3 last:border-0 last:pb-0"
                        >
                          <div>
                            <p className="font-medium text-white">{opp.label}</p>
                            <p className="mt-1 text-sm text-slate-400">{opp.rationale}</p>
                          </div>
                          <span className="shrink-0 text-sm tabular-nums text-emerald-300">
                            {opp.estimatedAdditionalMrrCents > 0
                              ? `+${formatAud(opp.estimatedAdditionalMrrCents)}/mo`
                              : "Ops fix"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
