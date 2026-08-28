import Link from "next/link";
import {
  attentionSummary,
  clientSignalsLabel,
  formatClientOrgSubtitle,
  formatClientSignalLine,
  getClientIntelligence,
  healthExplanation,
  recommendIntervention,
  tierLabel,
} from "@dg/platform-core";

import { ScoreCell, TierBadge } from "@/components/command/tier-badge";

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
      </header>
      <main className="dg-page-main space-y-8">
        {!intel ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — portfolio unavailable.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Organisations</p>
                <p className="mt-1 text-3xl font-semibold text-white">{clients.length}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Need attention</p>
                <p className="mt-1 text-3xl font-semibold text-amber-300">
                  {intel.needAttentionCount}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Avg Success Score™
                </p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {intel.averageSuccessScore}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Healthy</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  {intel.healthyCount}
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
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">Health</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Signals</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {clients.map((client) => {
                      const explanation = healthExplanation(client);
                      const signals = clientSignalsLabel(client);
                      return (
                        <tr key={client.organisationId} className="bg-slate-950/30">
                          <td className="px-4 py-3">
                            <Link
                              href={`/command/clients/${client.organisationId}`}
                              className="font-medium text-white hover:text-sky-300"
                            >
                              {client.organisationName}
                            </Link>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatClientOrgSubtitle(client)}
                            </p>
                            <p className="text-xs text-slate-600">
                              {formatClientSignalLine(client)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <TierBadge tier={client.healthTier} />
                            {explanation ? (
                              <p className="mt-1 max-w-xs text-[11px] leading-snug text-slate-500">
                                {explanation}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <ScoreCell score={client.successScore} />
                            {client.scoreProvisional ? (
                              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                                Provisional
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-300">
                            {client.status.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                signals === "Attention"
                                  ? "text-xs font-medium text-amber-300"
                                  : "text-xs font-medium text-emerald-400/90"
                              }
                            >
                              {signals}
                            </span>
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
                      );
                    })}
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
                  {attentionClients.length === 1 ? "" : "s"} currently require intervention.
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
                            {client.successScore} · {tierLabel(client.healthTier)}
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
