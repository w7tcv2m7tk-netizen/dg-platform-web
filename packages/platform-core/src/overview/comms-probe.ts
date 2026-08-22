import { communicationsHealthCheck } from "../communications";
import { listCommunicationAgents } from "../communications/agents";
import type { CommsProbe } from "./connector-probes";

/** Probe AI Communications for Business Overview / Digital Twin. */
export async function probeCommsConnector(
  organisationId: string,
  enabledAppIds: string[],
): Promise<CommsProbe> {
  const appEnabled = enabledAppIds.includes("ai-communications");
  const health = await communicationsHealthCheck(organisationId);
  const voiceLive = health.providers.voice === "elevenlabs";
  const emailLive = health.providers.email === "resend";

  let agentCount = 0;
  let publishedAgentCount = 0;
  try {
    const agents = await listCommunicationAgents(organisationId);
    agentCount = agents.length;
    publishedAgentCount = agents.filter(
      (agent) => agent.status === "published" || Boolean(agent.providerAgentId),
    ).length;
  } catch {
    /* non-fatal */
  }

  return {
    ok: voiceLive || emailLive || publishedAgentCount > 0 || (appEnabled && agentCount > 0),
    appEnabled,
    voiceProvider: voiceLive ? "elevenlabs" : undefined,
    emailProvider: emailLive ? "resend" : undefined,
    agentCount,
    publishedAgentCount,
  };
}
