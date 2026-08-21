import { createHmac, timingSafeEqual } from "crypto";

import type {
  CommunicationProvider,
  ProviderAgentRef,
  ProviderConversation,
  ProviderSessionRef,
  UpsertAgentInput,
  VoiceOption,
} from "./types";

const BASE = "https://api.elevenlabs.io";

/** Conversation LLMs accepted by ElevenLabs ConvAI (not TTS model ids). */
export const ELEVENLABS_CONVAI_LLMS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gpt-4o-mini",
  "gpt-4o",
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-5-mini",
  "gpt-5-nano",
  "claude-haiku-4-5",
  "claude-sonnet-4-5",
] as const;

export type ElevenLabsConvaiLlm = (typeof ELEVENLABS_CONVAI_LLMS)[number];

const DEFAULT_CONVAI_LLM: ElevenLabsConvaiLlm = "gemini-2.5-flash";

const ALLOWED_LLM = new Set<string>(ELEVENLABS_CONVAI_LLMS);

/** Map Agent Builder model field → valid ConvAI llm (never pass TTS ids). */
export function resolveElevenLabsConvaiLlm(model?: string | null): ElevenLabsConvaiLlm {
  const raw = model?.trim() || "";
  if (!raw) return DEFAULT_CONVAI_LLM;
  if (raw.startsWith("eleven_")) return DEFAULT_CONVAI_LLM;
  if (ALLOWED_LLM.has(raw)) return raw as ElevenLabsConvaiLlm;
  const lower = raw.toLowerCase();
  const match = ELEVENLABS_CONVAI_LLMS.find((id) => id === lower);
  return match ?? DEFAULT_CONVAI_LLM;
}

function apiKey(): string {
  return process.env.ELEVENLABS_API_KEY?.trim() || "";
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(apiKey());
}

async function elevenFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = apiKey();
  if (!key) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "xi-api-key": key,
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  return response;
}

async function elevenJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await elevenFetch(path, init);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`ElevenLabs ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function conversationConfig(input: UpsertAgentInput) {
  const tools = (input.tools ?? []).map((tool) => {
    const properties = tool.requestBodySchema?.properties ?? {};
    const bodyProperties: Record<string, Record<string, unknown>> = {};
    for (const [key, prop] of Object.entries(properties)) {
      bodyProperties[key] = {
        type: prop.type || "string",
        description: prop.description || key,
      };
    }
    return {
      type: "webhook",
      name: tool.name,
      description: tool.description,
      api_schema: {
        url: tool.url,
        method: tool.method ?? "POST",
        content_type: "application/json",
        request_headers: {
          Authorization: `Bearer ${process.env.ELEVENLABS_TOOL_SECRET?.trim() || apiKey()}`,
          "Content-Type": "application/json",
        },
        request_body_schema: {
          type: "object",
          description: tool.requestBodySchema?.description || `Parameters for ${tool.name}`,
          properties: bodyProperties,
          required: tool.requestBodySchema?.required ?? [],
        },
      },
    };
  });

  return {
    agent: {
      first_message: input.greeting || "Hello, how can I help you today?",
      language: (input.language || "en-AU").split("-")[0] || "en",
      prompt: {
        prompt: input.systemPrompt,
        llm: resolveElevenLabsConvaiLlm(input.model),
        ...(tools.length ? { tools } : {}),
      },
    },
    tts: {
      voice_id: input.voiceId || undefined,
      model_id: "eleven_flash_v2",
    },
  };
}

function asConversation(raw: Record<string, unknown>): ProviderConversation {
  const analysis =
    raw.analysis && typeof raw.analysis === "object"
      ? (raw.analysis as Record<string, unknown>)
      : {};
  const metadata =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const transcript = Array.isArray(raw.transcript) ? raw.transcript : [];
  const messages = transcript
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const row = turn as Record<string, unknown>;
      const content = String(row.message ?? row.text ?? "").trim();
      if (!content) return null;
      return {
        role: String(row.role ?? "user"),
        content,
        timestamp: row.time_in_call_secs
          ? new Date(Number(row.time_in_call_secs) * 1000)
          : undefined,
      };
    })
    .filter(Boolean) as ProviderConversation["messages"];

  const startUnix = Number(metadata.start_time_unix_secs ?? raw.start_time_unix_secs ?? 0);
  const duration = Number(
    metadata.call_duration_secs ?? raw.call_duration_secs ?? raw.duration_seconds ?? 0,
  );

  return {
    providerSessionId: String(raw.conversation_id ?? raw.conversationId ?? ""),
    agentProviderId: raw.agent_id ? String(raw.agent_id) : null,
    status: String(raw.status ?? "completed"),
    startedAt: startUnix ? new Date(startUnix * 1000) : null,
    endedAt: startUnix && duration ? new Date((startUnix + duration) * 1000) : null,
    durationSeconds: duration || null,
    transcript: messages?.map((m) => `${m.role}: ${m.content}`).join("\n") || null,
    summary:
      typeof analysis.transcript_summary === "string"
        ? analysis.transcript_summary
        : typeof raw.transcript_summary === "string"
          ? raw.transcript_summary
          : null,
    recordingUrl:
      typeof raw.audio_url === "string"
        ? raw.audio_url
        : typeof metadata.audio_url === "string"
          ? metadata.audio_url
          : null,
    callerPhone:
      typeof metadata.phone_number === "string"
        ? metadata.phone_number
        : typeof metadata.caller_id === "string"
          ? metadata.caller_id
          : null,
    messages,
    usage: {
      units: typeof raw.charge === "number" ? raw.charge : undefined,
    },
    raw,
  };
}

export class ElevenLabsProvider implements CommunicationProvider {
  readonly id = "elevenlabs" as const;

  async createAgent(config: UpsertAgentInput): Promise<ProviderAgentRef> {
    const created = await elevenJson<{ agent_id?: string; agentId?: string }>(
      "/v1/convai/agents/create",
      {
        method: "POST",
        body: JSON.stringify({
          name: config.name,
          conversation_config: conversationConfig(config),
        }),
      },
    );
    const providerAgentId = created.agent_id || created.agentId;
    if (!providerAgentId) throw new Error("ElevenLabs did not return an agent id");
    return { provider: this.id, providerAgentId };
  }

  async updateAgent(ref: ProviderAgentRef, config: UpsertAgentInput): Promise<ProviderAgentRef> {
    await elevenJson(`/v1/convai/agents/${encodeURIComponent(ref.providerAgentId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: config.name,
        conversation_config: conversationConfig(config),
      }),
    });
    return ref;
  }

  async deleteAgent(ref: ProviderAgentRef): Promise<void> {
    const response = await elevenFetch(
      `/v1/convai/agents/${encodeURIComponent(ref.providerAgentId)}`,
      { method: "DELETE" },
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`ElevenLabs delete failed: ${response.status}`);
    }
  }

  async getAgent(ref: ProviderAgentRef): Promise<Record<string, unknown> | null> {
    try {
      return await elevenJson(
        `/v1/convai/agents/${encodeURIComponent(ref.providerAgentId)}`,
      );
    } catch {
      return null;
    }
  }

  async listAgents(): Promise<Array<{ id: string; name: string }>> {
    const data = await elevenJson<{ agents?: Array<{ agent_id?: string; name?: string }> }>(
      "/v1/convai/agents",
    );
    return (data.agents ?? []).map((agent) => ({
      id: agent.agent_id || "",
      name: agent.name || "Agent",
    }));
  }

  async listVoices(): Promise<VoiceOption[]> {
    const data = await elevenJson<{ voices?: Array<Record<string, unknown>> }>("/v1/voices");
    return (data.voices ?? []).map((voice) => ({
      id: String(voice.voice_id ?? ""),
      name: String(voice.name ?? "Voice"),
      previewUrl: typeof voice.preview_url === "string" ? voice.preview_url : null,
      labels:
        voice.labels && typeof voice.labels === "object"
          ? (voice.labels as Record<string, string>)
          : undefined,
    }));
  }

  async getConversation(ref: ProviderSessionRef): Promise<ProviderConversation | null> {
    try {
      const raw = await elevenJson<Record<string, unknown>>(
        `/v1/convai/conversations/${encodeURIComponent(ref.providerSessionId)}`,
      );
      return asConversation(raw);
    } catch {
      return null;
    }
  }

  async listConversations(opts?: {
    agentProviderId?: string;
    limit?: number;
  }): Promise<ProviderConversation[]> {
    const params = new URLSearchParams();
    if (opts?.agentProviderId) params.set("agent_id", opts.agentProviderId);
    if (opts?.limit) params.set("page_size", String(opts.limit));
    const qs = params.toString();
    const data = await elevenJson<{ conversations?: Array<Record<string, unknown>> }>(
      `/v1/convai/conversations${qs ? `?${qs}` : ""}`,
    );
    return (data.conversations ?? []).map((row) => asConversation(row));
  }

  async getUsage(): Promise<{ connected: boolean; raw?: unknown }> {
    try {
      const raw = await elevenJson("/v1/user/subscription");
      return { connected: true, raw };
    } catch (err) {
      return { connected: false, raw: { error: String(err) } };
    }
  }
}

export function verifyElevenLabsWebhookSignature(input: {
  rawBody: string;
  signatureHeader?: string | null;
  secret?: string | null;
}): boolean {
  const secret = input.secret?.trim() || process.env.ELEVENLABS_WEBHOOK_SECRET?.trim();
  const header = input.signatureHeader?.trim();
  // Dev-only: allow unsigned when no secret configured
  if (!secret) return !header;
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [k, ...rest] = part.split("=");
      return [k.trim(), rest.join("=").trim()];
    }),
  );
  const timestamp = parts.t;
  // ElevenLabs may send v0=hex or multiple signatures
  const signature = parts.v0 || parts.v1;
  if (!timestamp || !signature) return false;

  const ageMs = Math.abs(Date.now() - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 30 * 60 * 1000) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest("hex");

  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    // Fall back to utf8 compare if signature is not hex-encoded
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }
}
