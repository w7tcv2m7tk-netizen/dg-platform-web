import { getCommunicationAgent } from "@dg/platform-core";

import { AgentBuilderForm } from "@/components/ai-communications/AgentBuilderForm";
import { CommsSubnav } from "@/components/ai-communications/CommsSubnav";
import { getPlatformPageContext } from "@/lib/org-apps";

export default async function AgentBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { session } = await getPlatformPageContext();
  const { id } = await searchParams;
  const agent =
    session && id ? await getCommunicationAgent(session.organisationId, id) : null;

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Agent Builder</h1>
        <p className="text-sm text-slate-400">
          {session?.organisationName ?? "DigitalGate"} · configure identity, purpose, tools, and
          compliance — not a raw provider prompt
        </p>
        <CommsSubnav active="/apps/ai-communications/agents" />
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to build agents.</p>
          </div>
        ) : (
          <AgentBuilderForm agent={agent} />
        )}
      </main>
    </>
  );
}
