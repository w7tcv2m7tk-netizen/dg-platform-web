import Link from "next/link";
import { getOperatorClientExpansionOpportunities } from "@dg/platform-core";

import { CommandHonestyBanner } from "@/components/command/CommandHonestyBanner";
import { requirePlatformOperatorContext } from "@/lib/platform-operator";

function formatAud(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function CommandExpansionPage() {
  const operator = await requirePlatformOperatorContext();
  const data = process.env.DATABASE_URL
    ? await getOperatorClientExpansionOpportunities(operator)
    : null;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command/opportunities" className="text-sm text-sky-400 hover:underline">
          ← Opportunities
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Client expansion</h1>
        <p className="mt-1 text-sm text-slate-400">
          Missing-app gaps priced from the static product catalogue (list prices) — not Stripe
          revenue. Part of DigitalGate Opportunity Engine™.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandHonestyBanner compact />

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — opportunities unavailable.
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 px-5 py-5">
              <p className="text-xs uppercase tracking-wide text-sky-400">
                Catalogue list-price gap · not Stripe MRR
              </p>
              <p className="mt-1 text-3xl font-semibold text-white">
                {data.totalPotentialMrrLabel}
                <span className="ml-2 text-base font-normal text-slate-400">
                  /mo catalogue list price
                </span>
              </p>
              <p className="mt-2 text-sm text-slate-400">{data.pricingNote}</p>
              <p className="mt-1 text-xs text-slate-500">
                Source: {data.pricingSource} · {data.summaries.length} client
                {data.summaries.length === 1 ? "" : "s"} with catalogue gaps
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
                          Catalogue{" "}
                          {formatAud(summary.totalPotentialMrrCents)}/mo list price (missing apps)
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
                          <span className="shrink-0 text-right text-sm tabular-nums text-sky-300">
                            {opp.estimatedAdditionalMrrCents > 0 ? (
                              <>
                                <span className="block">
                                  +{formatAud(opp.estimatedAdditionalMrrCents)}/mo
                                </span>
                                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                                  catalogue
                                </span>
                              </>
                            ) : (
                              "Ops fix"
                            )}
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
