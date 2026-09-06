import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCommunicationsOverview,
  listCommunicationAgents,
  listCommunicationSessions,
  sessionHasFeature,
} from "@dg/platform-core";

import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function CommsInboxPage() {
  const session = await getAuthorisedPlatformPageSession("comms.inbox.read");
  if (!session) notFound();

  const canViewCallCentre = sessionHasFeature(session, "comms.call_centre.read");
  const canViewVoice = sessionHasFeature(session, "comms.voice.read");
  const canConfigureAgents = sessionHasFeature(session, "comms.agents.configure");
  const canViewAnalytics = sessionHasFeature(session, "comms.analytics.read");
  const canViewBilling = sessionHasFeature(session, "comms.billing.read");

  const [overview, recent, agents] = await Promise.all([
    canViewAnalytics ? getCommunicationsOverview(session.organisationId) : Promise.resolve(null),
    canViewCallCentre
      ? listCommunicationSessions({ organisationId: session.organisationId, limit: 8 })
      : Promise.resolve(null),
    canViewVoice ? listCommunicationAgents(session.organisationId) : Promise.resolve(null),
  ]);

  const cards = overview
    ? [
        ["Calls today", String(overview.callsToday)],
        ["Conversations", String(overview.conversations)],
        ["Leads generated", String(overview.leadsGenerated)],
        ["Appointments booked", String(overview.appointmentsBooked)],
        ["AI resolution", `${overview.aiResolutionRate}%`],
        ...(canViewBilling
          ? [["Est. cost", `$${((overview.estimatedCostCents || 0) / 100).toFixed(2)}`]]
          : []),
      ]
    : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">AI Communications</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · DigitalGate owns the intelligence; the voice provider is underneath.
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {overview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map(([label, value]) => (
                <div key={label} className="dg-card">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            {overview.alerts.length ? (
              <div className="dg-card border-amber-500/30">
                <h2 className="font-semibold text-amber-200">Alerts</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                  {overview.alerts.map((alert) => <li key={alert}>{alert}</li>)}
                </ul>
              </div>
            ) : null}
          </>
        ) : (
          <div className="dg-card">
            <p className="text-sm text-slate-500">Analytics are not available for your current access.</p>
          </div>
        )}

        <div className="dg-card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Agents</h2>
            {canConfigureAgents ? (
              <Link href="/apps/ai-communications/agents" className="text-sm text-sky-400 hover:underline">
                Agent builder →
              </Link>
            ) : null}
          </div>
          {!canViewVoice ? (
            <p className="mt-3 text-sm text-slate-500">Voice agent details are not available for your current access.</p>
          ) : !agents?.length ? (
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
            {canViewCallCentre ? (
              <Link href="/apps/ai-communications/call-centre" className="text-sm text-sky-400 hover:underline">
                Call centre →
              </Link>
            ) : null}
          </div>
          {!canViewCallCentre ? (
            <p className="mt-3 text-sm text-slate-500">Conversation activity is not available for your current access.</p>
          ) : !recent?.items.length ? (
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
      </main>
    </>
  );
}
