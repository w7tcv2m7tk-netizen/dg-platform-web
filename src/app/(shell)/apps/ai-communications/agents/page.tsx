import {
  AGENT_STARTER_TEMPLATES,
  getCommunicationAgent,
  postCallWebhookUrl,
  publicAppOrigin,
} from "@dg/platform-core";

import { AgentBuilderForm } from "@/components/ai-communications/AgentBuilderForm";
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
          {session?.organisationName ?? "DigitalGate"} · AI employee builder — Provider → Identity →
          Behaviour → Business Brain → DigitalGate tools
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        {!session ? (
          <div className="dg-card">
            <p className="text-sm text-slate-400">Sign in to build agents.</p>
          </div>
        ) : (
          <AgentBuilderForm
            agent={agent}
            templates={AGENT_STARTER_TEMPLATES.map((t) => ({
              id: t.id,
              label: t.label,
              description: t.description,
              type: t.type,
              name: t.name,
              greeting: t.greeting,
              language: t.language,
              timezone: t.timezone,
              voiceId: t.voiceId,
              systemPrompt: t.systemPrompt,
              config: t.config,
            }))}
          />
        )}
        {session ? (
          <p className="text-xs text-slate-500">
            After publish, point ElevenLabs post-call webhook at{" "}
            <code className="text-slate-400">{postCallWebhookUrl()}</code> (origin{" "}
            <code className="text-slate-400">{publicAppOrigin()}</code>).
          </p>
        ) : null}
      </main>
    </>
  );
}
