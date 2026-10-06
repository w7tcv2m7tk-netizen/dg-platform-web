import { OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_PROFILE } from "./config.ts";
import type { ClaimedJob } from "./client.ts";

type TagsResponse = { models?: Array<{ name?: string; digest?: string; details?: { family?: string; parameter_size?: string; quantization_level?: string } }> };
type ChatResponse = { model?: string; done?: boolean; message?: { content?: string }; prompt_eval_count?: unknown; eval_count?: unknown };
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

async function boundedJson<T>(response: Response, maxBytes: number): Promise<T> {
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > maxBytes || !response.body) throw new OllamaContractError("invalid_output");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel(); throw new OllamaContractError("invalid_output"); }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8")) as T;
}

export class OllamaContractError extends Error {
  readonly code: "model_identity_mismatch" | "invalid_output" | "ollama_unavailable" | "inference_timeout";
  constructor(code: "model_identity_mismatch" | "invalid_output" | "ollama_unavailable" | "inference_timeout") {
    super(code); this.name = "OllamaContractError"; this.code = code;
  }
}

export async function assertPinnedModel(expectedDigest: string, signal?: AbortSignal, fetcher: typeof fetch = fetch) {
  try {
    const response = await fetcher(`${OLLAMA_BASE_URL}/api/tags`, { signal, redirect: "error" });
    if (!response.ok) throw new OllamaContractError("ollama_unavailable");
    const tags = await boundedJson<TagsResponse>(response, 1_000_000);
    const matches = tags.models?.filter((model) => model.name === OLLAMA_MODEL) ?? [];
    const details = matches[0]?.details;
    const family = (details?.family ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (matches.length !== 1 || matches[0].digest !== expectedDigest || !family.includes("qwen35") ||
        !/^9(?:\.\d+)?b$/i.test(details?.parameter_size ?? "") || details?.quantization_level !== "Q4_K_M") {
      throw new OllamaContractError("model_identity_mismatch");
    }
    return matches[0];
  } catch (error) {
    if (error instanceof OllamaContractError) throw error;
    throw new OllamaContractError("ollama_unavailable");
  }
}

export async function runOllama(job: ClaimedJob, signal: AbortSignal, fetcher: typeof fetch = fetch) {
  if (job.modelId !== OLLAMA_MODEL || job.maxOutputTokens < 1 || job.maxOutputTokens > 1200 ||
      job.contextBudgetTokens < 1 || job.contextBudgetTokens > 4096 || job.resultContract !== "crm_text_v1" || job.resultContractVersion !== 1 ||
      !["lead_summary", "lead_follow_up"].includes(job.task) || !Array.isArray(job.payload.messages) ||
      job.payload.messages.length < 1 || job.payload.messages.length > 16 || job.payload.messages.some((m) =>
        !["system", "user", "assistant"].includes(m.role) || typeof m.content !== "string" || Buffer.byteLength(m.content, "utf8") > 32_768)) {
    throw new OllamaContractError("invalid_output");
  }
  const timeout = AbortSignal.timeout(90_000);
  const requestSignal = AbortSignal.any([signal, timeout]);
  try {
    const response = await fetcher(`${OLLAMA_BASE_URL}/api/chat`, { method: "POST", redirect: "error", signal: requestSignal,
      headers: { "content-type": "application/json" }, body: JSON.stringify({
        model: OLLAMA_MODEL, messages: job.payload.messages, stream: false, think: false, keep_alive: "5m",
        options: { ...OLLAMA_PROFILE, num_predict: job.maxOutputTokens },
      }) });
    if (!response.ok) throw new OllamaContractError("ollama_unavailable");
    const data = await boundedJson<ChatResponse>(response, 100_000);
    if (data.model !== OLLAMA_MODEL || data.done !== true || typeof data.message?.content !== "string" ||
        !data.message.content.trim() || data.message.content.length > 20_000 || data.message.content.includes("\0")) {
      throw new OllamaContractError("invalid_output");
    }
    return { text: data.message.content.trim(), modelId: data.model,
      tokensIn: count(data.prompt_eval_count), tokensOut: count(data.eval_count) };
  } catch (error) {
    if (error instanceof OllamaContractError) throw error;
    if (timeout.aborted) throw new OllamaContractError("inference_timeout");
    if (signal.aborted) throw signal.reason ?? new Error("aborted");
    throw new OllamaContractError("ollama_unavailable");
  }
}
