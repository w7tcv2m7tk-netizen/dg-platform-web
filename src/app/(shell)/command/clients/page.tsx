import Link from "next/link";
import { getClientIntelligence, getCommandCentreOpsHome } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";
import { ProvisionReBetaButton } from "@/components/command/ProvisionReBetaButton";
import { ScoreCell, TierBadge } from "@/components/command/tier-badge";

export default async function CommandClientsPage() {
  const [intel, ops] = process.env.DATABASE_URL
    ? await Promise.all([getClientIntelligence(), getCommandCentreOpsHome()])
    : [null, null];

  const clients = intel?.clients ?? [];
  const reBetaCount =
    ops?.clients.filter((c) => c.reBeta).length ??
    clients.filter((c) => c.reBeta).length;

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Client intelligence</h1>
        <p className="mt-1 text-sm text-slate-400">
          Success Score™ ranking plus RE beta enrolment. Watch connector-down attention on pilots.
        </p>
      </header>
      <main className="dg-page-main space-y-8">
        <CommandCentreNav active="clients" />

        {!intel ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — client list unavailable.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Organisations</p>
                <p className="mt-1 text-3xl font-semibold text-white">{clients.length}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">RE beta</p>
                <p className="mt-1 text-3xl font-semibold text-sky-300">{reBetaCount}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Avg Success Score</p>
                <p className="mt-1 text-3xl font-semibold text-white">
                  {intel.averageSuccessScore}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Top performers</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  {intel.tierCounts.top_performer}
                </p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Needs attention</p>
                <p className="mt-1 text-3xl font-semibold text-amber-300">
                  {intel.tierCounts.needs_attention}
                </p>
              </div>
            </div>

            <section>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">Agency Health Ranking</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Enable RE beta to install Real Estate and open the pilot checklist. Bulk toggles
                    also live under{" "}
                    <Link href="/command/flags" className="text-sky-400 hover:underline">
                      Flags
                    </Link>
                    .
                  </p>
                </div>
                <Link href="/command/advisor" className="text-sm text-sky-400 hover:underline">
                  AI Advisor →
                </Link>
              </div>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">Score</th>
                      <th className="px-4 py-3 font-medium">Tier</th>
                      <th className="px-4 py-3 font-medium">CRM / Acc·RE</th>
                      <th className="px-4 py-3 font-medium">RE beta</th>
                      <th className="px-4 py-3 font-medium">Signals</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {clients.map((client) => (
                      <tr key={client.organisationId} className="bg-slate-950/30">
                        <td className="px-4 py-3 text-slate-500">{client.rank}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{client.organisationName}</p>
                          <p className="text-xs text-slate-500">
                            {client.organisationSlug}
                            {client.industry ? ` · ${client.industry}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <ScoreCell score={client.successScore} />
                        </td>
                        <td className="px-4 py-3">
                          <TierBadge tier={client.healthTier} />
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {client.leadCount} leads · {client.propertyCount}/
                          {client.stayBookingCount}
                        </td>
                        <td className="px-4 py-3">
                          <ProvisionReBetaButton
                            organisationId={client.organisationId}
                            organisationName={client.organisationName}
                            alreadyBeta={client.reBeta}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {client.needsAttention ? (
                            <span className="text-xs text-amber-300">
                              {client.attentionReasons[0] ?? "Attention"}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400/80">
                              {client.highlights[0] ?? "OK"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
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
                <p className="mt-4 text-sm text-slate-500">No organisations yet.</p>
              ) : null}
            </section>
          </>
        )}
      </main>
    </>
  );
}
