import Link from "next/link";
import { getCommandCentreOpsHome } from "@dg/platform-core";

import { CommandCentreNav } from "@/components/command/CommandCentreNav";

export default async function CommandClientsPage() {
  const data = process.env.DATABASE_URL ? await getCommandCentreOpsHome() : null;
  const clients = data?.clients ?? [];
  const attention = clients.filter((c) => c.needsAttention);
  const healthy = clients.filter((c) => !c.needsAttention);

  return (
    <>
      <header className="dg-page-header">
        <Link href="/command" className="text-sm text-sky-400 hover:underline">
          ← Command Centre
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Client intelligence</h1>
        <p className="mt-1 text-sm text-slate-400">
          Organisation health signals across tenants. Success Score™ ranking lands after Scoring v1.
        </p>
      </header>
      <main className="flex-1 space-y-8 p-6 md:p-8">
        <CommandCentreNav active="clients" />

        {!data ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-4 text-sm text-amber-100">
            Database not configured — client list unavailable.
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Organisations</p>
                <p className="mt-1 text-3xl font-semibold text-white">{clients.length}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Needs attention</p>
                <p className="mt-1 text-3xl font-semibold text-amber-300">{attention.length}</p>
              </div>
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 px-4 py-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Looking healthy</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-300">{healthy.length}</p>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-semibold text-white">All clients</h2>
              <p className="mt-1 text-sm text-slate-400">
                Sorted by recent activity. Switch org in the shell to deep-dive a tenant workspace.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-700/80">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Organisation</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Members</th>
                      <th className="px-4 py-3 font-medium">Leads</th>
                      <th className="px-4 py-3 font-medium">Listings / stays</th>
                      <th className="px-4 py-3 font-medium">Apps</th>
                      <th className="px-4 py-3 font-medium">Flags</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {clients.map((client) => (
                      <tr key={client.organisationId} className="bg-slate-950/30">
                        <td className="px-4 py-3">
                          <p className="font-medium text-white">{client.organisationName}</p>
                          <p className="text-xs text-slate-500">{client.organisationSlug}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{client.status}</td>
                        <td className="px-4 py-3 text-slate-300">{client.memberCount}</td>
                        <td className="px-4 py-3 text-slate-300">{client.leadCount}</td>
                        <td className="px-4 py-3 text-slate-300">
                          {client.propertyCount} / {client.stayBookingCount}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {client.installedApps.length
                            ? client.installedApps.slice(0, 3).join(", ")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {client.needsAttention ? (
                            <span className="text-xs text-amber-300">
                              {client.attentionReasons[0] ?? "Attention"}
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-400/80">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}
