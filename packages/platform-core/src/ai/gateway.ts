import type { BusinessContext } from "../org/business-context";
import {
  llmChat,
  LlmChatError,
  type LlmGenerateResult,
  type LlmChatMessage,
  type LlmProvider,
  type LlmTaskTier,
  type LlmTokenUsage,
  type LlmTransportAttempt,
} from "./llm";
import { recordAiLedgerEvent, type RecordAiLedgerEventInput } from "./usage";

export type AiGatewayActor = {
  type: "user" | "system" | "connector";
  id?: string;
};

export type AiGatewayDisclosurePolicy =
  | { mode: "cloud_allowed"; allowedProviders: readonly LlmProvider[] }
  | { mode: "local_only" };

/** Internal server contract. Routes must derive identity/context and policy themselves. */
export type AiGatewayRequest = {
  organisationId: string;
  actor: AiGatewayActor;
  correlationId: string;
  task: "lead_summary";
  businessContext: Pick<BusinessContext, "organisationId">;
  disclosurePolicy: AiGatewayDisclosurePolicy;
  messages: LlmChatMessage[];
  maxTokens: number;
  tier?: LlmTaskTier;
  /** Inference deadline, 1–20,000ms; defaults to 12,000ms. */
  deadlineMs?: number;
  signal?: AbortSignal;
};

export type AiGatewayResult = {
  text: string;
  provider: LlmProvider;
  model: string;
  latencyMs: number;
  usage: LlmTokenUsage;
  attempts: LlmTransportAttempt[];
  correlationId: string;
  accounting: "recorded" | "failed";
};

export type AiGatewayErrorCode =
  | "invalid_request"
  | "tenant_mismatch"
  | "policy_denied"
  | "local_transport_unavailable"
  | "deadline_exceeded"
  | "aborted"
  | "transport_failed"
  | "invalid_output";

export class AiGatewayError extends Error {
  readonly code: AiGatewayErrorCode;
  constructor(code: AiGatewayErrorCode) {
    super(`AI Gateway: ${code}`);
    this.name = "AiGatewayError";
    this.code = code;
  }
}

type GatewayDependencies = {
  chat?: typeof llmChat;
  record?: (input: RecordAiLedgerEventInput) => Promise<unknown>;
};

const PROVIDERS: readonly LlmProvider[] = ["gateway", "openai", "anthropic"];
const UNKNOWN_USAGE: LlmTokenUsage = { tokensIn: null, tokensOut: null };
const identifier = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_:.-]{1,200}$/.test(value);

// Explicit projection: never forward provider error text or arbitrary transport fields.
function safeAttempts(attempts: LlmTransportAttempt[]): LlmTransportAttempt[] {
  return attempts.map((attempt) => ({
    provider: attempt.provider,
    model: attempt.model,
    ok: attempt.ok,
    ...(attempt.ok ? {} : { error: "transport_failed" }),
    ...(attempt.usage ? { usage: attempt.usage } : {}),
  }));
}

async function untilAborted<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      signal.removeEventListener("abort", abort);
      reject(new AiGatewayError("aborted"));
    };
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => {
      signal.throwIfAborted();
      return operation();
    }).then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", abort);
    });
  });
}

/** Slice 1: policy boundary for lead summaries over the existing cloud transports. */
export async function aiGatewayGenerate(
  input: AiGatewayRequest,
  deps: GatewayDependencies = {},
): Promise<AiGatewayResult> {
  // Validate accounting identity first; malformed identities are never persisted.
  if (!identifier(input.organisationId) || !identifier(input.correlationId) ||
    !input.actor || !["user", "system", "connector"].includes(input.actor.type) ||
    (input.actor.type !== "system" && !identifier(input.actor.id)) ||
    (input.actor.id !== undefined && !identifier(input.actor.id))) {
    throw new AiGatewayError("invalid_request");
  }

  const identity = {
    organisationId: input.organisationId,
    actorId: input.actor.id,
    actorType: input.actor.type,
    correlationId: input.correlationId,
  };
  const started = Date.now();
  let result: LlmGenerateResult | undefined;
  let attempts: LlmTransportAttempt[] = [];
  let failure: AiGatewayError | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let signal: AbortSignal | undefined;
  let deadline: AbortController | undefined;

  try {
    if (input.businessContext?.organisationId !== identity.organisationId) {
      throw new AiGatewayError("tenant_mismatch");
    }
    if (input.task !== "lead_summary") throw new AiGatewayError("invalid_request");
    const policy = input.disclosurePolicy;
    if (policy?.mode === "local_only") throw new AiGatewayError("local_transport_unavailable");
    if (policy?.mode !== "cloud_allowed" || !Array.isArray(policy.allowedProviders) ||
      !policy.allowedProviders.length || policy.allowedProviders.some((p) => !PROVIDERS.includes(p))) {
      throw new AiGatewayError("policy_denied");
    }
    const deadlineMs = input.deadlineMs ?? 12_000;
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 20_000 ||
      !Number.isSafeInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > 4096 ||
      (input.tier !== undefined && input.tier !== "standard" && input.tier !== "reasoning") ||
      !Array.isArray(input.messages) || !input.messages.length || input.messages.some((message) =>
        !message || !["system", "user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
      throw new AiGatewayError("invalid_request");
    }

    deadline = new AbortController();
    timer = setTimeout(() => deadline?.abort(), deadlineMs);
    signal = input.signal ? AbortSignal.any([input.signal, deadline.signal]) : deadline.signal;
    const transportInput = {
      messages: input.messages.map(({ role, content }) => ({ role, content })),
      maxTokens: input.maxTokens,
      tier: input.tier ?? "standard",
      signal,
      allowedProviders: [...policy.allowedProviders],
      safeErrors: true,
    };
    result = await untilAborted(() => (deps.chat ?? llmChat)(transportInput), signal);
    signal.throwIfAborted();
    attempts = safeAttempts(result.attempts ?? []);
    if (!transportInput.allowedProviders.includes(result.provider)) throw new AiGatewayError("policy_denied");
    if (typeof result.text !== "string" || !result.text.trim() || result.text.length > 20_000) {
      throw new AiGatewayError("invalid_output");
    }
  } catch (error) {
    if (error instanceof LlmChatError) attempts = safeAttempts(error.attempts);
    failure = signal?.aborted
      ? new AiGatewayError(deadline?.signal.aborted ? "deadline_exceeded" : "aborted")
      : error instanceof AiGatewayError ? error : new AiGatewayError("transport_failed");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }

  const latencyMs = Date.now() - started;
  const usage = result?.usage ?? UNKNOWN_USAGE;
  let accounting: AiGatewayResult["accounting"] = "recorded";
  try {
    await (deps.record ?? recordAiLedgerEvent)({
      ...identity,
      eventType: "ai.assist_generated",
      title: "AI Gateway lead summary",
      provider: result?.provider ?? null,
      model: result?.model ?? null,
      latencyMs,
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      result: {
        gatewaySlice: 1,
        task: "lead_summary",
        outcome: failure?.code ?? "success",
        attempts,
        fallbackUsed: attempts.some((attempt) => !attempt.ok) && attempts.some((attempt) => attempt.ok),
      },
    });
  } catch {
    // Accounting availability must not discard a valid draft. Never log DB error payloads.
    accounting = "failed";
    console.warn("[ai-gateway] request accounting unavailable");
  }

  if (failure) throw failure;
  return {
    text: result!.text.trim(),
    provider: result!.provider,
    model: result!.model,
    latencyMs,
    usage,
    attempts,
    correlationId: identity.correlationId,
    accounting,
  };
}
