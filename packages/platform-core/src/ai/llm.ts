/**
 * Model router — OpenAI / Anthropic via fetch.
 * Apps never call providers directly; AI Service uses this.
 * Graceful: returns null when no API key is configured.
 */

export type LlmProvider = "openai" | "anthropic";

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

export function resolveLlmProvider(): {
  provider: LlmProvider;
  model: string;
  apiKey: string;
} | null {
  const preferred = envTrim("DG_LLM_PROVIDER").toLowerCase();
  const openai = openaiKey();
  const anthropic = anthropicKey();
  const openaiModel = envTrim("OPENAI_MODEL") || "gpt-4o-mini";
  const anthropicModel = envTrim("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";

  if (preferred === "openai" && openai) {
    return { provider: "openai", model: openaiModel, apiKey: openai };
  }
  if (preferred === "anthropic" && anthropic) {
    return { provider: "anthropic", model: anthropicModel, apiKey: anthropic };
  }
  // Prefer Anthropic when both set (DG default); else whichever exists.
  if (anthropic) {
    return { provider: "anthropic", model: anthropicModel, apiKey: anthropic };
  }
  if (openai) {
    return { provider: "openai", model: openaiModel, apiKey: openai };
  }
  return null;
}

export function llmConfigured(): boolean {
  return resolveLlmProvider() !== null;
}

async function callOpenAi(input: {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  maxTokens: number;
}): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: 0.6,
      max_tokens: input.maxTokens,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || `OpenAI HTTP ${res.status}`);
  }
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned empty content");
  return text;
}

async function callAnthropic(input: {
  apiKey: string;
  model: string;
  messages: LlmChatMessage[];
  maxTokens: number;
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

/** Call configured LLM. Throws on provider errors. */
export async function llmChat(input: {
  messages: LlmChatMessage[];
  maxTokens?: number;
}): Promise<LlmGenerateResult> {
  const resolved = resolveLlmProvider();
  if (!resolved) {
    throw new Error("No LLM API key configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)");
  }

  const started = Date.now();
  const maxTokens = input.maxTokens ?? 1200;
  const text =
    resolved.provider === "openai"
      ? await callOpenAi({
          apiKey: resolved.apiKey,
          model: resolved.model,
          messages: input.messages,
          maxTokens,
        })
      : await callAnthropic({
          apiKey: resolved.apiKey,
          model: resolved.model,
          messages: input.messages,
          maxTokens,
        });

  return {
    text,
    provider: resolved.provider,
    model: resolved.model,
    latencyMs: Date.now() - started,
  };
}
