import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCommunicationSession,
  listSessionActions,
  listSessionMessages,
  sessionHasFeature,
} from "@dg/platform-core";

import { CommsSubnav } from "@/components/ai-communications/CommsSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default async function CallDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { session } = await getPlatformPageContext();
  const { id } = await params;
  if (!session) {
    return (
      <>
        <header className="dg-page-header">
          <h1 className="text-2xl font-bold text-white">Conversation</h1>
          <CommsSubnav active="/apps/ai-communications/call-centre" />
        </header>
        <main className="dg-page-main">
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to view this conversation.</p>
          </div>
        </main>
      </>
    );
  }

  const row = await getCommunicationSession(session.organisationId, id);
  if (!row) notFound();

  const canHear = sessionHasFeature(session, "comms.voice.recording");
  const [messages, actions] = await Promise.all([
    listSessionMessages(session.organisationId, id),
    listSessionActions(session.organisationId, id),
  ]);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Conversation</h1>
        <p className="text-sm text-slate-400">
          {row.agentName ?? "Agent"} · {row.direction} {row.channel}
        </p>
        <CommsSubnav active="/apps/ai-communications/call-centre" />
      </header>
      <main className="dg-page-main space-y-6">
        <div className="dg-card grid gap-3 text-sm sm:grid-cols-2">
          <p><span className="text-slate-500">When: </span><span className="text-white">{formatDate(row.startedAt)}</span></p>
          <p><span className="text-slate-500">Status: </span><span className="text-white">{row.status}</span></p>
          <p><span className="text-slate-500">Duration: </span><span className="text-white">{row.durationSeconds ? `${row.durationSeconds}s` : "—"}</span></p>
          <p><span className="text-slate-500">Outcome: </span><span className="text-white">{(row.outcome ?? "—").replace(/_/g, " ")}</span></p>
          <p>
            <span className="text-slate-500">Contact: </span>
            {row.contactId ? (
              <Link href={`/apps/crm/contacts/${row.contactId}`} className="text-sky-400 hover:underline">
                Open CRM contact
              </Link>
            ) : (
              <span className="text-white">{row.callerPhone ?? "Unknown"}</span>
            )}
          </p>
          {row.opportunityId ? (
            <p>
              <span className="text-slate-500">Opportunity: </span>
              <Link href={`/apps/crm/opportunities/${row.opportunityId}`} className="text-sky-400 hover:underline">
                Open opportunity
              </Link>
            </p>
          ) : null}
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Summary</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
            {row.summary || "No summary yet."}
          </p>
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">Transcript</h2>
          {!canHear ? (
            <p className="mt-2 text-sm text-slate-500">
              Transcript access requires the recordings permission.
            </p>
          ) : messages.length ? (
            <ul className="mt-3 space-y-2 text-sm">
              {messages.map((msg) => (
                <li key={msg.id} className="rounded-lg border border-slate-800 px-3 py-2">
                  <p className="text-xs text-slate-500">{msg.sender}</p>
                  <p className="text-slate-200">{msg.content}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {row.transcript || "No transcript yet."}
            </p>
          )}
        </div>

        <div className="dg-card">
          <h2 className="font-semibold text-white">AI actions</h2>
          {!actions.length ? (
            <p className="mt-2 text-sm text-slate-500">No DigitalGate tools were invoked.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {actions.map((action) => (
                <li key={action.id} className="rounded-lg border border-slate-800 px-3 py-2">
                  <p className="text-white">
                    {action.status === "ok" ? "✓" : "✗"} {action.tool.replace(/_/g, " ")}
                  </p>
                  {action.entityType && action.entityId ? (
                    <p className="text-xs text-slate-500">
                      {action.entityType} {action.entityId}
                    </p>
                  ) : null}
                  {action.error ? <p className="text-xs text-rose-400">{action.error}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {canHear && row.recordingUrl ? (
          <div className="dg-card">
            <h2 className="font-semibold text-white">Recording</h2>
            <audio className="mt-3 w-full" controls src={row.recordingUrl} />
          </div>
        ) : null}
      </main>
    </>
  );
}
