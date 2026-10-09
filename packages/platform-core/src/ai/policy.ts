import { observeRouting, evidenceModel, type RoutingTraceObserver } from "./routing-trace";
import type { LlmChatMessage, LlmProvider, LlmTransportPlanEntry } from "./llm";

export type AiTask = "lead_summary" | "lead_follow_up";
export type AiClassification = "public" | "platform_internal" | "tenant_confidential" | "restricted";
export type AiLane = "local_routine" | "local_specialist" | "cloud_standard" | "cloud_reasoning" | "exact_observation";
export type AiCapability = "routine" | "specialist_coding" | "reasoning";
/** Gateway-managed upstream routing is admissible only for explicitly non-confidential inputs. */
export type AiRecipient = { transport: LlmProvider; upstream: "openai" | "anthropic" | "gateway_managed"; model: string };
export type AiDisclosurePolicy = {
  version: 1;
  classification: AiClassification;
  cloudPermitted: boolean;
  approvedRecipients: readonly AiRecipient[];
  localRequired: boolean;
  /** Explicitly permits disclosure to an approved local recipient. Omitted means false unless localRequired. */
  localPermitted?: boolean;
  cloudFallbackPermitted: boolean;
};
export type AiExecutionRequirements = {
  capability: AiCapability;
  grounding: "authorised_context" | "none";
  output: "text" | "structured";
  latencyClass: "interactive" | "background";
  contextBudgetTokens: number;
};
export type AiExecutionPolicy = {
  preferredLane: AiLane;
  fallbackPermitted: boolean;
  escalationPermitted: boolean;
  maxAttempts: number;
  requirements?: Partial<AiExecutionRequirements>;
  exactTarget?: AiRecipient;
  /** Server-derived deployment hint. Database approval is checked again before enqueue and disclosure. */
  localDeploymentId?: string;
};
export type AiAuthorisedInput = {
  organisationId: string;
  messages: LlmChatMessage[];
  disclosure: AiDisclosurePolicy;
  evidence: readonly {
    organisationId: string;
    source: "crm" | "business_context";
    disclosure: AiDisclosurePolicy;
  }[];
};
export type AiTaskDefinition = {
  version: 1;
  requirements: AiExecutionRequirements;
  minimumClassification: AiClassification;
  maxOutputTokens: number;
  resultContract: "crm_text_v1";
};
const CLASSIFICATIONS: readonly AiClassification[] = ["public", "platform_internal", "tenant_confidential", "restricted"];
const LANES: readonly AiLane[] = ["local_routine", "local_specialist", "cloud_standard", "cloud_reasoning", "exact_observation"];
const CAPABILITIES: readonly AiCapability[] = ["routine", "specialist_coding", "reasoning"];
const requirements = Object.freeze({ capability: "routine", grounding: "authorised_context", output: "text", latencyClass: "interactive", contextBudgetTokens: 4096 } as const);
const definition = Object.freeze({ version: 1, requirements, minimumClassification: "tenant_confidential", maxOutputTokens: 1200, resultContract: "crm_text_v1" } as const);
export const AI_TASK_DEFINITIONS: Readonly<Record<AiTask, AiTaskDefinition>> = Object.freeze({ lead_summary: definition, lead_follow_up: definition });
/** Explicit approval, independent of OPENAI_MODEL. Configuration is intersected, never treated as approval. */
export const CRM_APPROVED_RECIPIENT: Readonly<AiRecipient> = Object.freeze({ transport: "openai", upstream: "openai", model: "gpt-4o-mini" });
export function crmDisclosurePolicy(): AiDisclosurePolicy {
  return { version: 1, classification: "tenant_confidential", cloudPermitted: true, approvedRecipients: [{ ...CRM_APPROVED_RECIPIENT }], localRequired: false, localPermitted: true, cloudFallbackPermitted: false };
}
export function crmExecutionPolicy(): AiExecutionPolicy {
  return { preferredLane: "cloud_standard", fallbackPermitted: false, escalationPermitted: false, maxAttempts: 1 };
}
export type AiPolicyCode = "invalid_request" | "tenant_mismatch" | "policy_denied" | "local_transport_unavailable" | "capability_unavailable" | "context_exceeded";
export class AiPolicyError extends Error {
  readonly code: AiPolicyCode;
  readonly classification?: AiClassification;
  constructor(code: AiPolicyCode, classification?: AiClassification) {
    super(`AI policy: ${code}`); this.name = "AiPolicyError"; this.code = code; this.classification = classification;
  }
}
function deny(): never { throw new AiPolicyError("policy_denied"); }
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const keys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every((key) => allowed.includes(key));
function recipient(value: unknown): value is AiRecipient {
  if (!object(value) || !keys(value, ["transport", "upstream", "model"]) || typeof value.model !== "string" || !/^[a-zA-Z0-9_./:-]{1,160}$/.test(value.model)) return false;
  return (value.transport === "openai" && value.upstream === "openai") ||
    (value.transport === "anthropic" && value.upstream === "anthropic") ||
    (value.transport === "gateway" && value.upstream === "gateway_managed");
}
const sameRecipient = (a: AiRecipient, b: AiRecipient) => a.transport === b.transport && a.upstream === b.upstream && a.model === b.model;
export function validateDisclosurePolicy(value: unknown): asserts value is AiDisclosurePolicy {
  if (!object(value) || !keys(value, ["version", "classification", "cloudPermitted", "approvedRecipients", "localRequired", "localPermitted", "cloudFallbackPermitted"]) ||
    value.version !== 1 || !CLASSIFICATIONS.includes(value.classification as AiClassification) ||
    typeof value.cloudPermitted !== "boolean" || typeof value.localRequired !== "boolean" ||
    (value.localPermitted !== undefined && typeof value.localPermitted !== "boolean") || typeof value.cloudFallbackPermitted !== "boolean" ||
    !Array.isArray(value.approvedRecipients) || value.approvedRecipients.length > 8 || !Array.from(value.approvedRecipients).every(recipient)) deny();
  if ((!value.cloudPermitted && (value.approvedRecipients.length || value.cloudFallbackPermitted)) ||
    (value.localRequired && (value.cloudPermitted || value.cloudFallbackPermitted)) ||
    (value.classification === "restricted" && (!value.localRequired || value.cloudPermitted))) deny();
}
export function intersectDisclosure(policies: readonly AiDisclosurePolicy[], floor: AiClassification): AiDisclosurePolicy {
  if (!policies.length || !CLASSIFICATIONS.includes(floor)) deny();
  policies.forEach(validateDisclosurePolicy);
  const classification = CLASSIFICATIONS[Math.max(CLASSIFICATIONS.indexOf(floor), ...policies.map((p) => CLASSIFICATIONS.indexOf(p.classification)))];
  const localRequired = classification === "restricted" || policies.some((p) => p.localRequired);
  const cloudPermitted = !localRequired && policies.every((p) => p.cloudPermitted);
  const localPermitted = localRequired || policies.every((p) => p.localPermitted === true);
  const approvedRecipients = cloudPermitted
    ? policies[0].approvedRecipients.filter((r) => policies.every((p) => p.approvedRecipients.some((a) => sameRecipient(a, r))))
    : [];
  // A caller cannot widen the platform's confidential recipient approval.
  return { version: 1, classification, localRequired, localPermitted, cloudPermitted,
    cloudFallbackPermitted: cloudPermitted && policies.every((p) => p.cloudFallbackPermitted),
    approvedRecipients: classification === "tenant_confidential"
      ? approvedRecipients.filter((r) => sameRecipient(r, CRM_APPROVED_RECIPIENT)) : approvedRecipients };
}

/** Policy invariant only: no observation task is registered or migrated in Slice 2. */
export function validateExactObservation(input: { target: AiRecipient; plan: readonly AiRecipient[]; grounding: "none" | "authorised_context"; escalationPermitted: boolean }): void {
  if (!recipient(input.target) || input.target.transport === "gateway" || input.grounding !== "none" || input.escalationPermitted !== false ||
    !Array.isArray(input.plan) || input.plan.length !== 1 || !recipient(input.plan[0]) || !sameRecipient(input.target, input.plan[0])) deny();
}
export type AiDeployment = AiRecipient & { lane: "cloud_standard" | "cloud_reasoning"; capability: AiCapability };
/** Unknown configured models are not capability-certified. Legacy callers keep their existing chain. */
export function describeAiDeployments(configured: readonly LlmTransportPlanEntry[], observer?: RoutingTraceObserver): AiDeployment[] {
  return configured.flatMap(({ provider, model }, index): AiDeployment[] => {
    const deployments = describeAiDeployment(provider, model);
    observeRouting(observer, () => ({ stage: "certification", index, transport: provider, model: evidenceModel(model),
      reason: deployments.length ? "policy_certified" : "uncertified_candidate" }));
    return deployments;
  });
}
function describeAiDeployment(provider: LlmProvider, model: string): AiDeployment[] {
  if (provider === "openai" && model === CRM_APPROVED_RECIPIENT.model) return [{ transport: provider, upstream: "openai", model, lane: "cloud_standard", capability: "routine" }];
  if (provider === "gateway" && model === "openai/gpt-5.4-mini") return [{ transport: provider, upstream: "gateway_managed", model, lane: "cloud_standard", capability: "routine" }];
  if (provider === "anthropic" && model === "claude-sonnet-4-20250514") return [{ transport: provider, upstream: "anthropic", model, lane: "cloud_standard", capability: "routine" }];
  return [];
}

export type AiRoutingDecision = {
  task: AiTask; definition: AiTaskDefinition; disclosure: AiDisclosurePolicy;
  requirements: AiExecutionRequirements; plan: AiDeployment[]; reason: "approved_cloud_plan" | "approved_cloud_fallback" | "approved_local_plan";
  localDeploymentId?: string;
};
type AiRoutingInput = {
  organisationId: string; task: AiTask; authorisedInput: AiAuthorisedInput;
  disclosurePolicy: AiDisclosurePolicy; executionPolicy: AiExecutionPolicy;
  maxTokens: number; deployments: readonly AiDeployment[];
};
/** Optional internal observation; returned decisions and existing errors are unchanged. */
export function resolveAiRouting(input: AiRoutingInput, observer?: RoutingTraceObserver): AiRoutingDecision {
  let outcomeObserved = false;
  const trace: RoutingTraceObserver | undefined = observer ? (event) => {
    if (event.stage === "outcome") outcomeObserved = true;
    return observer(event);
  } : undefined;
  try {
    const decision = resolveAiRoutingInternal(input, trace);
    observeRouting(trace, () => ({ stage: "outcome", category: "allowed", reason: decision.reason === "approved_local_plan" ? "approved_local_plan" : "approved_cloud_plan" }));
    return decision;
  } catch (error) {
    if (!outcomeObserved && error instanceof AiPolicyError) observeRouting(trace, () => ({ stage: "outcome",
      category: error.code === "invalid_request" || error.code === "tenant_mismatch" ? "invalid_request" :
        error.code === "capability_unavailable" ? "technical_unavailability" : "policy_rejection", reason: error.code === "local_transport_unavailable" ? "local_required_lane_mismatch" : error.code }));
    throw error;
  }
}
function resolveAiRoutingInternal(input: AiRoutingInput, observer?: RoutingTraceObserver): AiRoutingDecision {
  const task = Object.hasOwn(AI_TASK_DEFINITIONS, input.task) ? AI_TASK_DEFINITIONS[input.task] : undefined;
  if (!task) throw new AiPolicyError("invalid_request");
  observeRouting(observer, () => ({ stage: "task", task: input.task, taskVersion: task.version }));
  const envelope = input.authorisedInput;
  if (!envelope || envelope.organisationId !== input.organisationId || !Array.isArray(envelope.evidence) ||
    Array.from(envelope.evidence).some((e) => !e || e.organisationId !== input.organisationId)) throw new AiPolicyError("tenant_mismatch");
  if (envelope.evidence.length > 16 || envelope.evidence.some((e) => !["crm", "business_context"].includes(e.source)) ||
    !Array.isArray(envelope.messages) || !envelope.messages.length || envelope.messages.length > 16 ||
    Array.from(envelope.messages).some((m) => !m || !["user", "assistant", "system"].includes(m.role) || typeof m.content !== "string")) throw new AiPolicyError("invalid_request");
  // Source classification floors prevent mislabeled CRM/operational evidence from becoming public.
  const floor = envelope.evidence.length ? "tenant_confidential" : task.minimumClassification;
  const disclosure = intersectDisclosure([input.disclosurePolicy, envelope.disclosure, ...envelope.evidence.map((e) => e.disclosure)], floor);
  observeRouting(observer, () => ({ stage: "disclosure", classification: disclosure.classification,
    cloudPermitted: disclosure.cloudPermitted, localRequired: disclosure.localRequired, localPermitted: disclosure.localPermitted === true,
    cloudFallbackPermitted: disclosure.cloudFallbackPermitted,
    recipients: disclosure.approvedRecipients.map((r) => ({ transport: r.transport, upstream: r.upstream, model: evidenceModel(r.model) })) }));
  try {
    const execution = input.executionPolicy;
    if (!object(execution) || !keys(execution, ["preferredLane", "fallbackPermitted", "escalationPermitted", "maxAttempts", "requirements", "exactTarget", "localDeploymentId"]) ||
      !LANES.includes(execution.preferredLane) || typeof execution.fallbackPermitted !== "boolean" || typeof execution.escalationPermitted !== "boolean" ||
      !Number.isSafeInteger(execution.maxAttempts) || execution.maxAttempts < 1 || execution.maxAttempts > 3) deny();
    if (execution.localDeploymentId !== undefined && execution.preferredLane !== "local_routine") deny();
    const extra = execution.requirements === undefined ? {} : execution.requirements;
    if (!object(extra) || !keys(extra, ["capability", "grounding", "output", "latencyClass", "contextBudgetTokens"])) deny();
    const req: AiExecutionRequirements = { ...task.requirements, ...extra };
    if (!CAPABILITIES.includes(req.capability) || req.grounding !== task.requirements.grounding || req.output !== task.requirements.output ||
      req.latencyClass !== task.requirements.latencyClass || !Number.isSafeInteger(req.contextBudgetTokens) || req.contextBudgetTokens < 1 ||
      req.contextBudgetTokens > task.requirements.contextBudgetTokens) deny();
    observeRouting(observer, () => ({ stage: "constraints", preferredLane: execution.preferredLane,
      fallbackPermitted: execution.fallbackPermitted, escalationPermitted: execution.escalationPermitted, maxAttempts: execution.maxAttempts,
      capability: req.capability, grounding: req.grounding, output: req.output, latencyClass: req.latencyClass, contextBudgetTokens: req.contextBudgetTokens }));
    if (execution.preferredLane === "exact_observation" || execution.exactTarget !== undefined) deny();
    if (disclosure.localRequired && execution.preferredLane !== "local_routine") throw new AiPolicyError("local_transport_unavailable", disclosure.classification);
    if (!Number.isSafeInteger(input.maxTokens) || input.maxTokens < 1 || input.maxTokens > task.maxOutputTokens) throw new AiPolicyError("invalid_request");
    observeRouting(observer, () => ({ stage: "output_budget", maxOutputTokens: input.maxTokens }));
    if (execution.preferredLane === "local_specialist") {
      observeRouting(observer, () => ({ stage: "outcome", category: "technical_unavailability", reason: "specialist_unavailable" }));
      throw new AiPolicyError("capability_unavailable", disclosure.classification);
    }
    // UTF-8 bytes conservatively upper-bound byte-level text tokens; allow framing margin.
    // This is deliberately an upper bound, not a claim to measure provider token usage.
    const contextUpperBound = envelope.messages.reduce((n, m) => n + new TextEncoder().encode(m.content).length + 64, 64) + input.maxTokens;
    if (contextUpperBound > req.contextBudgetTokens) throw new AiPolicyError("context_exceeded");
    if (execution.preferredLane === "cloud_reasoning" && req.capability !== "reasoning") deny();
    if (execution.preferredLane === "local_routine") {
      if (execution.fallbackPermitted || execution.escalationPermitted) {
        observeRouting(observer, () => ({ stage: "outcome", category: "policy_rejection", reason: "local_fallback_forbidden" }));
        throw new AiPolicyError("local_transport_unavailable", disclosure.classification);
      }
      if (!disclosure.localPermitted || req.capability !== "routine" ||
          typeof execution.localDeploymentId !== "string" || !/^[A-Za-z0-9_-]{1,120}$/.test(execution.localDeploymentId)) deny();
      return { task: input.task, definition: task, disclosure, requirements: req, plan: [],
        reason: "approved_local_plan", localDeploymentId: execution.localDeploymentId };
    }
    if (!disclosure.cloudPermitted || !disclosure.approvedRecipients.length) deny();
    const permitted = input.deployments.filter((d) => disclosure.approvedRecipients.some((r) => sameRecipient(r, d)));
    const capable = permitted.filter((d) => d.capability === req.capability);
    const traceCandidates = (plan: readonly AiDeployment[]) => {
      if (!observer) return;
      let nextEligiblePosition = 0;
      try { input.deployments.forEach((d, index) => observeRouting(observer, () => {
        const position = plan.includes(d) ? nextEligiblePosition++ : -1;
        const limit = execution.fallbackPermitted && disclosure.cloudFallbackPermitted ? execution.maxAttempts : 1;
        return { stage: "candidate", index, transport: d.transport, model: evidenceModel(d.model),
          reason: !permitted.includes(d) ? "recipient_not_permitted" : !capable.includes(d) ? "capability_mismatch" :
            position < 0 ? "lane_not_permitted" : position >= limit ? "eligible_attempt_limit" : position === 0 ? "eligible_primary" : "eligible_fallback" };
      })); } catch { /* Candidate observation cannot affect the plan. */ }
    };
    if (permitted.length && !capable.length) {
      traceCandidates([]);
      throw new AiPolicyError("capability_unavailable");
    }
    const plan = capable.filter((d) => d.lane === execution.preferredLane || execution.escalationPermitted);
    traceCandidates(plan);
    if (!plan.length) {
      observeRouting(observer, () => ({ stage: "outcome",
        category: !input.deployments.length ? "technical_unavailability" : "policy_rejection",
        reason: !input.deployments.length ? "no_available_certified_deployments" : !permitted.length ? "no_permitted_deployments" : "lane_not_permitted" }));
      deny();
    }
    return { task: input.task, definition: task, disclosure, requirements: req,
      plan: plan.slice(0, execution.fallbackPermitted && disclosure.cloudFallbackPermitted ? execution.maxAttempts : 1),
      reason: "approved_cloud_plan" };
  } catch (error) {
    if (error instanceof AiPolicyError) throw new AiPolicyError(error.code, disclosure.classification);
    throw error;
  }
}
export function validateAiTextResult(text: unknown): text is string {
  return typeof text === "string" && Boolean(text.trim()) && text.length <= 20_000 && !text.includes("\0");
}
