/**
 * Model router — Vercel AI Gateway, direct OpenAI, and Anthropic via fetch.
 * Apps never call providers directly; AI Service uses this.
 * Gateway is a transport, not a replacement: OpenAI / Anthropic stay as fallbacks.
 * Template fallback lives in callers (generate.ts, advisor, etc.).
 */

export type LlmProvider = "gateway" | "openai" | "anthropic";

/** Cheap extraction / assist vs high-value reasoning (Sol via Gateway when available). */
export type LlmTaskTier = "standard" | "reasoning";

export type LlmChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmGenerateResult = {
  text: string;
  provider: LlmProvider;
  model: string;
  latencyMs: number;
};

type LlmTransport = {
  provider: LlmProvider;
  model: string;
  apiKey: string;
};

const GATEWAY_CHAT_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const DEFAULT_GATEWAY_STANDARD_MODEL = "openai/gpt-5.4-mini";
const DEFAULT_GATEWAY_REASONING_MODEL = "openai/gpt-5.6-sol";
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

/**
 * Bracket lookup so Next/Turbopack cannot replace this with an empty string
 * at build time (static `process.env.OPENAI_API_KEY` is inlined during
 * `next build`, which is why Platform Intelligence returned `no_llm` on
 * Vercel even when the Production secret existed).
 */
function envTrim(name: string): string {
  const bag = process.env as Record<string, string | undefined>;
  return (bag[name] ?? "").trim();
}

function openaiKey() {
  return envTrim("OPENAI_API_KEY");
}

function anthropicKey() {
  return envTrim("ANTHROPIC_API_KEY");
}

/** AI Gateway API key, or Vercel OIDC on deployments. Never send OPENAI_API_KEY here (BYOK / misses Sol promo). */
function gatewayToken() {
  return envTrim("AI_GATEWAY_API_KEY") || envTrim("VERCEL_OIDC_TOKEN");
}

function preferredProvider(): LlmProvider | "" {
  const preferred = envTrim("DG_LLM_PROVIDER").toLowerCase();
  if (preferred === "gateway" || preferred === "openai" || preferred === "anthropic") {
    return preferred;
  }
  return "";
}

function gatewayModelForTier(tier: LlmTaskTier): string {
  if (tier === "reasoning") {
    return envTrim("DG_LLM_GATEWAY_REASONING_MODEL") || DEFAULT_GATEWAY_REASONING_MODEL;
  }
  return envTrim("DG_LLM_GATEWAY_MODEL") || DEFAULT_GATEWAY_STANDARD_MODEL;
}

function openaiModel(): string {
  return envTrim("OPENAI_MODEL") || DEFAULT_OPENAI_MODEL;
}

function anthropicModel(): string {
  return envTrim("ANTHROPIC_MODEL") || DEFAULT_ANTHROPIC_MODEL;
}

function configuredTransports(tier: LlmTaskTier): LlmTransport[] {
  const gateway = gatewayToken();
  const openai = openaiKey();
  const anthropic = anthropicKey();
  const available: LlmTransport[] = [];
  if (gateway) {
    available.push({
      provider: "gateway",
      model: gatewayModelForTier(tier),
      apiKey: gateway,
    });
  }
  if (anthropic) {
    available.push({
      provider: "anthropic",
      model: anthropicModel(),
      apiKey: anthropic,
    });
  }
  if (openai) {
    available.push({
      provider: "openai",
      model: openaiModel(),
      apiKey: openai,
    });
  }
  return available;
}

/**
 * Order: explicit DG_LLM_PROVIDER first when that transport is keyed,
 * else Gateway when keyed (promo + Vercel billing), else Anthropic, else OpenAI.
 * Remaining keyed transports stay as failover.
 */
export function resolveLlmTransports(tier: LlmTaskTier = "standard"): LlmTransport[] {
  const available = configuredTransports(tier);
  const preferred = preferredProvider();
  if (!preferred) return available;
  const head = available.filter((t) => t.provider === preferred);
  const rest = available.filter((t) => t.provider !== preferred);
  return [...head, ...rest];
}

/** First transport in the failover chain (legacy helper). */
export function resolveLlmProvider(): LlmTransport | null {
  return resolveLlmTransports("standard")[0] ?? null;
}

export function llmConfigured(): boolean {
  return configuredTransports("standard").length > 0;
}

export function llmConfiguredTransports(): LlmProvider[] {
  return configuredTransports("standard").map((t) => t.provider);
}

function isGpt5Family(model: string): boolean {
  return /gpt-5/i.test(model);
}

async function callOpenAiCompatible(input: {
  url: string;
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  maxTokens: number;
  label: "OpenAI" | "AI Gateway";
  signal?: AbortSignal;
}): Promise<string> {
  const gpt5 = isGpt5Family(input.model);
  const body: Record<string, unknown> = {
    model: input.model,
    messages: input.messages,
  };
  if (gpt5) {
    body.max_completion_tokens = input.maxTokens;
  } else {
    body.temperature = 0.6;
    body.max_tokens = input.maxTokens;
  }

  const res = await fetch(input.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: input.signal,
  });
  const json = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `${input.label} HTTP ${res.status}`);
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error(`${input.label} returned empty content`);
  return text;
}

async function callOpenAi(input: {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<string> {
  return callOpenAiCompatible({
    url: "https://api.openai.com/v1/chat/completions",
    apiKey: input.apiKey,
    model: input.model,
    messages: input.messages,
    maxTokens: input.maxTokens,
    label: "OpenAI",
    signal: input.signal,
  });
}

async function callGateway(input: {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<string> {
  return callOpenAiCompatible({
    url: GATEWAY_CHAT_URL,
    apiKey: input.apiKey,
    model: input.model,
    messages: input.messages,
    maxTokens: input.maxTokens,
    label: "AI Gateway",
    signal: input.signal,
  });
}

async function callAnthropic(input: {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  maxTokens: number;
  signal?: AbortSignal;
}): Promise<string> {
  const system = input.messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const messages = input.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": input.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      max_tokens: input.maxTokens,
      system: system || undefined,
      messages:
        messages.length > 0
          ? messages
          : [{ role: "user", content: "Respond briefly." }],
    }),
    signal: input.signal,
  });
  const json = (await res.json().catch(() => ({}))) as {
    content?: Array<{ type?: string; text?: string }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `Anthropic HTTP ${res.status}`);
  }
  const text = json.content
    ?.filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("\n")
    .trim();
  if (!text) throw new Error("Anthropic returned empty content");
  return text;
}

async function callTransport(
  transport: LlmTransport,
  messages: LlmChatMessage[],
  maxTokens: number,
  signal?: AbortSignal,
): Promise<string> {
  if (transport.provider === "gateway") {
    return callGateway({
      apiKey: transport.apiKey,
      model: transport.model,
      messages,
      maxTokens,
      signal,
    });
  }
  if (transport.provider === "openai") {
    return callOpenAi({
      apiKey: transport.apiKey,
      model: transport.model,
      messages,
      maxTokens,
      signal,
    });
  }
  return callAnthropic({
    apiKey: transport.apiKey,
    model: transport.model,
    messages,
    maxTokens,
    signal,
  });
}

/** Call configured LLM. Tries Gateway → remaining keyed transports. Throws on total failure. */
export async function llmChat(input: {
  messages: LlmChatMessage[];
  maxTokens?: number;
  tier?: LlmTaskTier;
  signal?: AbortSignal;
}): Promise<LlmGenerateResult> {
  const chain = resolveLlmTransports(input.tier ?? "standard");
  if (chain.length === 0) {
    throw new Error(
      "No LLM configured (AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN, OPENAI_API_KEY, or ANTHROPIC_API_KEY)",
    );
  }

  const started = Date.now();
  const maxTokens = input.maxTokens ?? 1200;
  let lastError: unknown;

  for (const transport of chain) {
    if (input.signal?.aborted) break;
    try {
      const text = await callTransport(
        transport,
        input.messages,
        maxTokens,
        input.signal,
      );
      return {
        text,
        provider: transport.provider,
        model: transport.model,
        latencyMs: Date.now() - started,
      };
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[ai] ${transport.provider} failed — trying next transport`, message);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All LLM transports failed");
}
