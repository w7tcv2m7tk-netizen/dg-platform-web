import Link from "next/link";
import {
  attentionSummary,
  clientScoreTierDisplay,
  clientScoreTierEmoji,
  clientScoreTierLabel,
  formatClientObservedSignal,
  getClientIntelligence,
  recommendIntervention,
} from "@dg/platform-core";

import { ScoreCell, ScoreTierBadge } from "@/components/command/tier-badge";

export default async function CustomerPortfolioPage() {
  const intel = process.env.DATABASE_URL ? await getClientIntelligence() : null;
  const clients = intel?.clients ?? [];
  const attentionClients = clients.filter((c) => c.needsAttention);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Customer Intelligence</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          Understand customer health, adoption, activity, opportunities and risks across
          the DigitalGate customer base.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-slate-500">
          Success Score™ measures overall customer/platform health. Operational signals may
          require intervention regardless of score.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        {!intel ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — portfolio unavailable.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Organisations</p>
                <p className="mt-1 text-3xl font-semibold text-white">{clients.length}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg score</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {intel.averageSuccessScore}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Excellent</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  {intel.excellentCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Healthy</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  {intel.healthyCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Needs attention
                </p>
                <p className="mt-1 text-3xl font-semibold text-amber-300">
                  {intel.needsAttentionBandCount}
                </p>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-white">Customer Health Ranking</h2>
              <p className="mt-1 text-sm text-slate-400">
                Who needs attention, why, and what DigitalGate should do next.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">
                        <span className="block">Score</span>
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-600">
                          Quantitative Success Score™
                        </span>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <span className="block">Tier</span>
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-600">
                          Score classification
                        </span>
                      </th>
                      <th className="px-4 py-3 font-medium">
                        <span className="block">Signal</span>
                        <span className="mt-0.5 block text-[10px] font-normal normal-case tracking-normal text-slate-600">
                          What DigitalGate has observed
                        </span>
                      </th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {clients.map((client) => (
                      <tr key={client.organisationId} className="bg-slate-950/30">
                        <td className="px-4 py-3 tabular-nums text-slate-500">{client.rank}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/command/clients/${client.organisationId}`}
                            className="font-medium text-white hover:text-sky-300"
                          >
                            {client.organisationName}
                            {client.isInternalOrg ? (
                              <span className="ml-1.5 text-xs font-normal text-sky-400/90">
                                · Internal
                              </span>
                            ) : null}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <ScoreCell score={client.successScore} />
                        </td>
                        <td className="px-4 py-3">
                          <ScoreTierBadge
                            tier={clientScoreTierDisplay(client)}
                            emoji={clientScoreTierEmoji(client)}
                          />
                        </td>
                        <td className="max-w-md px-4 py-3 text-slate-400">
                          {formatClientObservedSignal(client)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Link
                            href={`/command/clients/${client.organisationId}`}
                            className="text-sm text-sky-400 hover:underline"
                          >
                            Open
                          </Link>
                          <span className="mx-1.5 text-slate-600">·</span>
                          <Link
                            href={`/command/advisor?org=${client.organisationId}`}
                            className="text-sm text-sky-400 hover:underline"
                          >
                            Advise
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {clients.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">No customer organisations yet.</p>
              ) : null}
            </section>

            {attentionClients.length > 0 ? (
              <section>
                <h2 className="text-lg font-semibold text-white">Attention Required</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {attentionClients.length} organisation
                  {attentionClients.length === 1 ? "" : "s"} require intervention based on
                  operational signals — not score tier alone.
                </p>
                <div className="mt-4 space-y-3">
                  {attentionClients.map((client) => (
                    <div
                      key={client.organisationId}
                      className="rounded-xl border border-amber-500/20 bg-slate-950/50 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/command/clients/${client.organisationId}`}
                            className="font-medium text-white hover:text-sky-300"
                          >
                            {client.organisationName}
                          </Link>
                          <p className="mt-0.5 text-sm text-slate-400">
                            {client.successScore} · {clientScoreTierLabel(client)}
                          </p>
                          <p className="mt-2 text-sm text-slate-300">
                            {attentionSummary(client)}
                          </p>
                          <p className="mt-2 text-sm text-sky-200/90">
                            <span className="text-slate-500">Recommended: </span>
                            {recommendIntervention(client)}
                          </p>
                        </div>
                        <div className="shrink-0 whitespace-nowrap text-sm">
                          <Link
                            href={`/command/clients/${client.organisationId}`}
                            className="text-sky-400 hover:underline"
                          >
                            Open
                          </Link>
                          <span className="mx-1.5 text-slate-600">·</span>
                          <Link
                            href={`/command/advisor?org=${client.organisationId}`}
                            className="text-sky-400 hover:underline"
                          >
                            Advise
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
