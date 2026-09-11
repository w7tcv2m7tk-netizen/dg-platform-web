import {
  AGENT_STARTER_TEMPLATES,
  getCommunicationAgent,
  getOrganisationById,
} from "@dg/platform-core";
import { notFound } from "next/navigation";

import { AgentBuilderForm } from "@/components/ai-communications/AgentBuilderForm";
import { safeTimeZone } from "@/lib/organisation-timezone";
import { getAuthorisedPlatformPageSession } from "@/lib/platform-page-feature";

export default async function AgentBuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getAuthorisedPlatformPageSession("comms.agents.configure");
  if (!session) notFound();

  const { id } = await searchParams;
  const [agent, organisation] = await Promise.all([
    id ? getCommunicationAgent(session.organisationId, id) : Promise.resolve(null),
    getOrganisationById(session.organisationId),
  ]);
  const defaultTimezone = safeTimeZone(organisation?.timezone);

  return (
    <>
      <header className="dg-page-header">
        <h1 className="text-2xl font-bold text-white">Agent Builder</h1>
        <p className="text-sm text-slate-400">
          {session.organisationName} · configure your AI employee’s identity, behaviour, Business Brain access and DigitalGate tools
        </p>
      </header>
      <main className="dg-page-main space-y-6">
        <AgentBuilderForm
          agent={agent}
          defaultTimezone={defaultTimezone}
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
      </main>
    </>
  );
}
