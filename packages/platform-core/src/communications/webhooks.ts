import { findAgentByProviderId, getCommunicationAgent } from "./agents";
import { ingestProviderConversation } from "./orchestrator";
import { verifyElevenLabsWebhookSignature } from "./providers/elevenlabs";
import { executeAgentTool, type ToolResult } from "./tools";
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
  const transcript = Array.isArray(body.transcript)
    ? body.transcript
    : Array.isArray(body.transcript_turns)
      ? body.transcript_turns
      : [];
  const messages = transcript
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const row = turn as Record<string, unknown>;
      const content = String(row.message ?? row.text ?? row.content ?? "").trim();
      if (!content) return null;
      return {
        role: String(row.role ?? "user"),
        content,
      };
    })
    .filter(Boolean) as ProviderConversation["messages"];

  const startUnix = Number(metadata.start_time_unix_secs ?? body.start_time_unix_secs ?? 0);
  const duration = Number(
    metadata.call_duration_secs ?? body.call_duration_secs ?? body.duration_seconds ?? 0,
  );

  return {
    providerSessionId:
      pickString(body.conversation_id, body.conversationId, payload.conversation_id) || "",
    agentProviderId: pickString(body.agent_id, body.agentId, payload.agent_id),
    status: pickString(body.status, payload.type) || "completed",
    startedAt: startUnix ? new Date(startUnix * 1000) : null,
    endedAt: startUnix && duration ? new Date((startUnix + duration) * 1000) : null,
    durationSeconds: duration || null,
    transcript: messages?.map((m) => `${m.role}: ${m.content}`).join("\n") || null,
    summary:
      pickString(
        analysis.transcript_summary,
        body.transcript_summary,
        analysis.summary,
        body.summary,
      ) || null,
    recordingUrl: pickString(body.audio_url, metadata.audio_url, body.recording_url),
    callerPhone: pickString(
      metadata.phone_number,
      metadata.caller_id,
      metadata.called_number,
      body.caller_id,
      body.caller_phone,
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
  if (!conversation.providerSessionId) {
    return { ok: false, error: "missing_conversation_id" };
  }

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

export async function processElevenLabsToolCall(
  payload: Record<string, unknown>,
  opts?: { agentId?: string | null; tool?: string | null },
): Promise<ToolResult> {
  const tool =
    pickString(
      opts?.tool,
      payload.tool_name,
      payload.toolName,
      payload.name,
      asRecord(payload.tool).name,
    ) || "";

  const dgAgentId = pickString(opts?.agentId, payload.dg_agent_id, payload.agentId);
  const agentProviderId = pickString(payload.agent_id, payload.elevenlabs_agent_id);
  const conversationId = pickString(payload.conversation_id, payload.conversationId);

  const nestedParams = asRecord(
    payload.parameters ?? payload.arguments ?? payload.args ?? payload.tool_parameters,
  );
  const reserved = new Set([
    "tool_name",
    "toolName",
    "name",
    "tool",
    "agent_id",
    "agentId",
    "dg_agent_id",
    "elevenlabs_agent_id",
    "conversation_id",
    "conversationId",
    "parameters",
    "arguments",
    "args",
    "tool_parameters",
  ]);
  const flatArgs: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (!reserved.has(key)) flatArgs[key] = value;
  }
  const args = Object.keys(nestedParams).length ? nestedParams : flatArgs;

  if (!tool) {
    return { ok: false, tool: "unknown", error: "tool is required" };
  }

  let agent =
    dgAgentId != null
      ? await (async () => {
          const { prisma } = await import("@dg/database");
          const row = await prisma.communicationAgent.findFirst({
            where: { id: dgAgentId },
          });
          if (!row) return null;
          return getCommunicationAgent(row.organisationId, row.id);
        })()
      : null;

  if (!agent && agentProviderId) {
    agent = await findAgentByProviderId("elevenlabs", agentProviderId);
  }

  if (!agent) return { ok: false, tool, error: "unknown_agent" };

  const config = agent.config as AgentBuilderConfig;
  const enabledTools = config.enabledTools?.length
    ? config.enabledTools
    : [
        "get_business_profile",
        "get_business_hours",
        "search_contact",
        "create_contact",
        "create_opportunity",
        "create_task",
      ];

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
