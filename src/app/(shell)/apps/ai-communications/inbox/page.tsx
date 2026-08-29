import Link from "next/link";
import {
  getCommunicationsOverview,
  listCommunicationAgents,
  listCommunicationSessions,
} from "@dg/platform-core";

import { getPlatformPageContext } from "@/lib/org-apps";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function CommsInboxPage() {
  const { session } = await getPlatformPageContext();

  const overview = session
    ? await getCommunicationsOverview(session.organisationId)
    : null;
  const recent = session
    ? await listCommunicationSessions({ organisationId: session.organisationId, limit: 8 })
    : { items: [] };
  const agents = session ? await listCommunicationAgents(session.organisationId) : [];

  const cards = overview
    ? [
        ["Calls today", String(overview.callsToday)],
        ["Conversations", String(overview.conversations)],
        ["Leads generated", String(overview.leadsGenerated)],
        ["Appointments booked", String(overview.appointmentsBooked)],
        ["AI resolution", `${overview.aiResolutionRate}%`],
        ["Est. cost", `$${((overview.estimatedCostCents || 0) / 100).toFixed(2)}`],
      ]
    : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">AI Communications</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · DigitalGate owns the intelligence;
          the voice provider is underneath.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view AI Communications.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(([label, value]) => (
                <div key={label} className="dg-card">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {overview?.alerts.length ? (
              <div className="dg-card border-amber-500/30">
                <h2 className="font-semibold text-amber-200">Alerts</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {overview.alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="dg-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">Agents</h2>
                <Link href="/apps/ai-communications/agents" className="text-sm text-sky-400 hover:underline">
                  Agent builder →
                </Link>
              </div>
              {!agents.length ? (
                <p className="mt-3 text-sm text-slate-500">No voice agents yet.</p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {agents.slice(0, 6).map((agent) => (
                    <li key={agent.id} className="flex justify-between gap-2 border-b border-slate-800/60 py-2">
                      <span className="text-white">{agent.name}</span>
                      <span className="text-slate-500">{agent.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="dg-card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">Recent activity</h2>
                <Link href="/apps/ai-communications/call-centre" className="text-sm text-sky-400 hover:underline">
                  Call centre →
                </Link>
              </div>
              {!recent.items.length ? (
                <p className="mt-3 text-sm text-slate-500">
                  Calls and messages appear here after the first conversation is recorded.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {recent.items.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/apps/ai-communications/call-centre/${item.id}`}
                        className="block rounded-lg border border-slate-800 px-3 py-2 text-sm hover:border-slate-700"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="text-white">
                            {item.agentName ?? "Agent"} · {item.direction} {item.channel}
                          </span>
                          <span className="text-slate-500">{formatDate(item.startedAt)}</span>
                        </div>
                        <p className="mt-1 text-slate-400">
                          {item.outcome ?? item.status}
                          {item.summary ? ` — ${item.summary.slice(0, 120)}` : ""}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}
