import Link from "next/link";
import { listCommunicationAgents } from "@dg/platform-core";

import { AiConversationsSubnav } from "@/components/ai-communications/AiConversationsSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function VoiceAgentsPage() {
  const { session } = await getPlatformPageContext();
  const agents = session ? await listCommunicationAgents(session.organisationId) : [];

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Voice Agents</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · AI employees for your business — voice
          provider underneath, DigitalGate intelligence on top
        </p>
              <AiConversationsSubnav active="/apps/ai-communications/voice" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to manage voice agents.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <Link
                href="/apps/ai-communications/agents"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
              >
                Create voice agent
              </Link>
            </div>
            {!agents.length ? (
              <div className="dg-card">
                <p className="text-sm text-slate-400">
                  Create a receptionist, sales, or support agent in Agent Builder, then publish it.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {agents.map((agent) => (
                  <li key={agent.id} className="dg-card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-semibold text-white">{agent.name}</h2>
                        <p className="mt-1 text-sm text-slate-400">
                          {agent.description || "No description"}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                          {agent.type} · {agent.language} · {agent.provider}
                          {agent.providerAgentId ? ` · ${agent.providerAgentId}` : ""}
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300">
                        {agent.status}
                      </span>
                    </div>
                    <Link
                      href={`/apps/ai-communications/agents?id=${agent.id}`}
                      className="mt-3 inline-block text-sm text-sky-400 hover:underline"
                    >
                      Open in Agent Builder →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </>
  );
}
