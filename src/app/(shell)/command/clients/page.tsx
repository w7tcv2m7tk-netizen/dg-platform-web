import Link from "next/link";
import { getClientIntelligence } from "@dg/platform-core";

import { ScoreCell, TierBadge } from "@/components/command/tier-badge";

function attentionLabel(client: {
  needsAttention: boolean;
  attentionReasons: string[];
  highlights: string[];
  healthTier: string;
}): string {
  if (client.needsAttention) {
    return client.attentionReasons[0] ?? "Attention";
  }
  if (client.healthTier === "top_performer" || client.healthTier === "healthy") {
    return "Strong";
  }
  return client.highlights[0] ?? "OK";
}

export default async function CustomerPortfolioPage() {
  const intel = process.env.DATABASE_URL ? await getClientIntelligence() : null;
  const clients = intel?.clients ?? [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Customer Portfolio</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-400">
          See the health, activity, opportunities and platform adoption of every DigitalGate
          customer.
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
                  {intel.tierCounts.needs_attention}
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
                <p className="text-xs uppercase tracking-wide text-slate-500">Top performers</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">
                  {intel.tierCounts.top_performer}
                </p>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-white">Customer Health Ranking</h2>
              <p className="mt-1 text-sm text-slate-400">
                Who needs attention, why, and what to do next. Open a customer for adoption detail;
                use Advise for Command Centre AI Advisor in that org&apos;s context.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">Health</th>
                      <th className="px-4 py-3 font-medium">Success Score™</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Leads</th>
                      <th className="px-4 py-3 font-medium">Opportunities</th>
                      <th className="px-4 py-3 font-medium">Attention</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {clients.map((client) => (
                      <tr key={client.organisationId} className="bg-slate-950/30">
                        <td className="px-4 py-3">
                          <Link
                            href={`/command/clients/${client.organisationId}`}
                            className="font-medium text-white hover:text-sky-300"
                          >
                            {client.organisationName}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {client.organisationSlug}
                            {client.industry ? ` · ${client.industry}` : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <TierBadge tier={client.healthTier} />
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
                        <td className="px-4 py-3 tabular-nums text-slate-300">
                          {client.leadCount}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-300">
                          {client.openOpportunities > 0 ? client.openOpportunities : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={
                              client.needsAttention
                                ? "text-xs text-amber-300"
                                : "text-xs text-emerald-400/80"
                            }
                          >
                            {attentionLabel(client)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
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
          </>
        )}
      </main>
    </>
  );
}
