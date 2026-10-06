import type { BusinessContext } from "../org/business-context";
import { llmChat, describeLlmTransportPlan, LlmChatError, type LlmGenerateResult, type LlmTokenUsage, type LlmTransportAttempt } from "./llm";
import { recordAiLedgerEvent, type RecordAiLedgerEventInput } from "./usage";
import { AI_TASK_DEFINITIONS, AiPolicyError, describeAiDeployments, resolveAiRouting, validateAiTextResult,
  type AiAuthorisedInput, type AiClassification, type AiDisclosurePolicy, type AiExecutionPolicy, type AiRoutingDecision, type AiTask } from "./policy";

export type AiGatewayActor = { type: "user" | "system" | "connector"; id?: string };
export type AiGatewayDisclosurePolicy = AiDisclosurePolicy;
/** Internal server contract: identity, authorisation and disclosure are never browser inputs. */
export type AiGatewayRequest = {
  organisationId: string; actor: AiGatewayActor; correlationId: string; task: AiTask;
  businessContext: Pick<BusinessContext, "organisationId">;
  authorisedInput: AiAuthorisedInput;
  disclosurePolicy: AiDisclosurePolicy; executionPolicy: AiExecutionPolicy;
  maxTokens: number;
  /** Inference deadline, 1–20,000ms; defaults to 12,000ms. */
  deadlineMs?: number; signal?: AbortSignal;
};
export type AiGatewayResult = {
  text: string; provider: LlmGenerateResult["provider"]; model: string; latencyMs: number;
  usage: LlmTokenUsage; attempts: LlmTransportAttempt[]; correlationId: string;
  accounting: "recorded" | "failed"; routing: AiRoutingDecision;
};
export type AiGatewayErrorCode = AiPolicyError["code"] | "deadline_exceeded" | "aborted" | "transport_failed" | "invalid_output";
export class AiGatewayError extends Error {
  readonly code: AiGatewayErrorCode;
  constructor(code: AiGatewayErrorCode) { super(`AI Gateway: ${code}`); this.name = "AiGatewayError"; this.code = code; }
}
type GatewayDependencies = { chat?: typeof llmChat; record?: (input: RecordAiLedgerEventInput) => Promise<unknown> };
const identifier = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_:.-]{1,200}$/.test(value);
const reportedToken = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const safeUsage = (value?: LlmTokenUsage): LlmTokenUsage => ({ tokensIn: reportedToken(value?.tokensIn), tokensOut: reportedToken(value?.tokensOut) });
function safeAttempts(attempts: LlmTransportAttempt[], routing?: AiRoutingDecision): LlmTransportAttempt[] {
  if (!Array.isArray(attempts) || !routing) return [];
  return attempts.slice(0, routing.plan.length).flatMap((attempt, index) => {
    const target = routing.plan[index];
    if (!attempt || attempt.provider !== target.transport || attempt.model !== target.model) return [];
    return [{ provider: target.transport, model: target.model, ok: attempt.ok === true,
      ...(attempt.ok === true ? {} : { error: "transport_failed" }), usage: safeUsage(attempt.usage) }];
  });
}
async function untilAborted<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener("abort", abort); reject(new AiGatewayError("aborted")); };
    signal.addEventListener("abort", abort, { once: true });
    Promise.resolve().then(() => { signal.throwIfAborted(); return operation(); }).then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}
/** Slice 2: two CRM text tasks, authorised payload policy and constrained cloud execution. */
export async function aiGatewayGenerate(input: AiGatewayRequest, deps: GatewayDependencies = {}): Promise<AiGatewayResult> {
  if (!identifier(input.organisationId) || !identifier(input.correlationId) || !input.actor ||
    !["user", "system", "connector"].includes(input.actor.type) ||
    (input.actor.type !== "system" && !identifier(input.actor.id)) || (input.actor.id !== undefined && !identifier(input.actor.id))) throw new AiGatewayError("invalid_request");
  const identity = { organisationId: input.organisationId, actorId: input.actor.id, actorType: input.actor.type, correlationId: input.correlationId };
  const started = Date.now();
  let result: LlmGenerateResult | undefined;
  let routing: AiRoutingDecision | undefined;
  let attempts: LlmTransportAttempt[] = [];
  let failure: AiGatewayError | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let signal: AbortSignal | undefined;
  let deadline: AbortController | undefined;
  let accepted = false;
  let deniedClassification: AiClassification | undefined;
  try {
    if (input.businessContext?.organisationId !== identity.organisationId) throw new AiGatewayError("tenant_mismatch");
    const deadlineMs = input.deadlineMs ?? 12_000;
    if (!Number.isSafeInteger(deadlineMs) || deadlineMs < 1 || deadlineMs > 20_000) throw new AiGatewayError("invalid_request");
    routing = resolveAiRouting({ organisationId: identity.organisationId, task: input.task, authorisedInput: input.authorisedInput,
      disclosurePolicy: input.disclosurePolicy, executionPolicy: input.executionPolicy, maxTokens: input.maxTokens,
      deployments: describeAiDeployments(describeLlmTransportPlan("standard")) });
    deadline = new AbortController();
    timer = setTimeout(() => deadline?.abort(), Math.max(0, deadlineMs - (Date.now() - started)));
    signal = input.signal ? AbortSignal.any([input.signal, deadline.signal]) : deadline.signal;
    if (Date.now() - started >= deadlineMs) deadline.abort();
    const transportInput = {
      messages: input.authorisedInput.messages.map(({ role, content }) => ({ role, content })),
      maxTokens: input.maxTokens, tier: "standard" as const, signal,
      executionPlan: routing.plan.map((d) => ({ provider: d.transport, model: d.model })),
      allowedProviders: routing.plan.map((d) => d.transport), safeErrors: true,
    };
    result = await untilAborted(() => (deps.chat ?? llmChat)(transportInput), signal);
    signal.throwIfAborted();
    attempts = safeAttempts(result.attempts ?? [], routing);
    if (!routing.plan.some((d) => d.transport === result!.provider && d.model === result!.model)) throw new AiGatewayError("policy_denied");
    if (!validateAiTextResult(result.text)) throw new AiGatewayError("invalid_output");
    accepted = true;
  } catch (error) {
    if (error instanceof AiPolicyError) deniedClassification = error.classification;
    if (error instanceof LlmChatError) attempts = safeAttempts(error.attempts, routing);
    failure = signal?.aborted ? new AiGatewayError(deadline?.signal.aborted ? "deadline_exceeded" : "aborted") :
      error instanceof AiGatewayError ? error : error instanceof AiPolicyError ? new AiGatewayError(error.code) : new AiGatewayError("transport_failed");
  } finally { if (timer !== undefined) clearTimeout(timer); }
  const latencyMs = Date.now() - started;
  const lastAttempt = attempts.at(-1);
  const selected = routing?.plan.find((d) => d.transport === (result?.provider ?? lastAttempt?.provider) && d.model === (result?.model ?? lastAttempt?.model));
  const usage = safeUsage(selected ? result?.usage : undefined);
  const task = Object.hasOwn(AI_TASK_DEFINITIONS, input.task) ? input.task : null;
  let accounting: AiGatewayResult["accounting"] = "recorded";
  try {
    await (deps.record ?? recordAiLedgerEvent)({ ...identity, eventType: "ai.assist_generated", title: "AI Gateway CRM draft",
      provider: selected?.transport ?? null, model: selected?.model ?? null, latencyMs, tokensIn: usage.tokensIn, tokensOut: usage.tokensOut,
      result: { gatewaySlice: 2, task, taskVersion: task ? AI_TASK_DEFINITIONS[task].version : null, policyVersion: 1,
        classification: routing?.disclosure.classification ?? deniedClassification ?? null, policyDecision: routing ? "allowed" : "denied",
        policyReason: routing?.reason ?? failure?.code ?? "invalid_request", selectedLane: selected?.lane ?? null,
        transport: selected?.transport ?? null, upstream: selected?.upstream ?? null, model: selected?.model ?? null,
        execution: selected ? "cloud" : null, outcome: failure?.code ?? "success", failureCategory: failure?.code ?? null,
        resultContract: routing?.definition.resultContract ?? null, validation: accepted ? "passed" : result ? "failed" : "not_run",
        attempts, fallbackUsed: routing?.reason === "approved_cloud_fallback" || (attempts.some((a) => !a.ok) && attempts.some((a) => a.ok)),
        escalationUsed: Boolean(selected && routing && selected.lane !== input.executionPolicy.preferredLane && routing.reason !== "approved_cloud_fallback") },
    });
  } catch { accounting = "failed"; console.warn("[ai-gateway] request accounting unavailable"); }
  if (failure) throw failure;
  return { text: result!.text.trim(), provider: result!.provider, model: result!.model, latencyMs, usage, attempts,
    correlationId: identity.correlationId, accounting, routing: routing! };
}
