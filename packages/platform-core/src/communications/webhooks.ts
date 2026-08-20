import { findAgentByProviderId } from "./agents";
import { ingestProviderConversation } from "./orchestrator";
import { verifyElevenLabsWebhookSignature } from "./providers/elevenlabs";
import { executeAgentTool } from "./tools";
import { upsertCommunicationSession } from "./sessions";
import type { AgentBuilderConfig, ProviderConversation } from "./providers/types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function conversationFromPayload(payload: Record<string, unknown>): ProviderConversation {
  const nested = asRecord(payload.data);
  const body = Object.keys(nested).length ? nested : payload;
  const analysis = asRecord(body.analysis);
  const metadata = asRecord(body.metadata);
  const transcript = Array.isArray(body.transcript) ? body.transcript : [];
  const messages = transcript
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const row = turn as Record<string, unknown>;
      const content = String(row.message ?? row.text ?? "").trim();
      if (!content) return null;
      return {
        role: String(row.role ?? "user"),
        content,
      };
    })
    .filter(Boolean) as ProviderConversation["messages"];

  const startUnix = Number(metadata.start_time_unix_secs ?? body.start_time_unix_secs ?? 0);
  const duration = Number(metadata.call_duration_secs ?? body.call_duration_secs ?? 0);

  return {
    providerSessionId: pickString(body.conversation_id, body.conversationId, payload.conversation_id) || "",
    agentProviderId: pickString(body.agent_id, body.agentId, payload.agent_id),
    status: pickString(body.status, payload.type) || "completed",
    startedAt: startUnix ? new Date(startUnix * 1000) : null,
    endedAt: startUnix && duration ? new Date((startUnix + duration) * 1000) : null,
    durationSeconds: duration || null,
    transcript: messages?.map((m) => `${m.role}: ${m.content}`).join("\n") || null,
    summary:
      pickString(analysis.transcript_summary, body.transcript_summary, analysis.summary) ||
      null,
    recordingUrl: pickString(body.audio_url, metadata.audio_url),
    callerPhone: pickString(
      metadata.phone_number,
      metadata.caller_id,
      metadata.called_number,
      body.caller_id,
    ),
    messages,
    usage: {
      units: typeof body.charge === "number" ? body.charge : undefined,
    },
    raw: payload,
  };
}

export function verifyCommunicationsWebhook(input: {
  rawBody: string;
  signatureHeader?: string | null;
}): boolean {
  return verifyElevenLabsWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    secret: process.env.ELEVENLABS_WEBHOOK_SECRET,
  });
}

export async function processElevenLabsWebhook(input: {
  rawBody: string;
  signatureHeader?: string | null;
}): Promise<{ ok: boolean; ignored?: boolean; sessionId?: string; error?: string }> {
  if (!verifyCommunicationsWebhook(input)) {
    return { ok: false, error: "invalid_signature" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(input.rawBody) as Record<string, unknown>;
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  const type = pickString(payload.type, payload.event) || "post_call_transcription";
  if (type.includes("audio") && !type.includes("transcription")) {
    return { ok: true, ignored: true };
  }

  const conversation = conversationFromPayload(payload);
  const ingested = await ingestProviderConversation({
    provider: "elevenlabs",
    conversation,
  });

  if (!ingested) return { ok: true, ignored: true };
  return { ok: true, sessionId: ingested.sessionId };
}

export function verifyAgentToolRequest(req: Request): boolean {
  const expected =
    process.env.ELEVENLABS_TOOL_SECRET?.trim() || process.env.ELEVENLABS_API_KEY?.trim();
  if (!expected) return false;
  const header = req.headers.get("authorization")?.trim() || "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header;
  return Boolean(token) && token === expected;
}

export async function processElevenLabsToolCall(payload: Record<string, unknown>) {
  const tool =
    pickString(payload.tool_name, payload.toolName, payload.name, asRecord(payload.tool).name) ||
    "";
  const agentProviderId = pickString(payload.agent_id, payload.agentId);
  const conversationId = pickString(payload.conversation_id, payload.conversationId);
  const args = asRecord(
    payload.parameters ?? payload.arguments ?? payload.args ?? payload.tool_parameters,
  );

  if (!tool || !agentProviderId) {
    return { ok: false, error: "tool and agent_id are required" };
  }

  const agent = await findAgentByProviderId("elevenlabs", agentProviderId);
  if (!agent) return { ok: false, error: "unknown_agent" };

  const config = agent.config as AgentBuilderConfig;
  const enabledTools = config.enabledTools?.length
    ? config.enabledTools
    : ["get_business_profile", "get_business_hours", "search_contact", "create_contact", "create_task"];

  let sessionId: string | null = null;
  if (conversationId) {
    const session = await upsertCommunicationSession({
      organisationId: agent.organisationId,
      agentId: agent.id,
      provider: "elevenlabs",
      providerSessionId: conversationId,
      channel: "voice",
      direction: "inbound",
      status: "in_progress",
    });
    sessionId = session.id;
  }

  return executeAgentTool({
    ctx: {
      organisationId: agent.organisationId,
      agentId: agent.id,
      sessionId,
      enabledTools,
    },
    tool,
    args,
  });
}
