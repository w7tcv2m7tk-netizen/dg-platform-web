/** Internal observational contract. No payloads, tenant identifiers or arbitrary strings. */
export const ROUTING_TRACE_VERSION = 1 as const;
const models = ["gpt-4o-mini", "openai/gpt-5.4-mini", "claude-sonnet-4-20250514"] as const;
export function evidenceModel(model: string): typeof models[number] | null {
  return models.find((known) => known === model) ?? null;
}
type Model = ReturnType<typeof evidenceModel>;
type Recipient = { transport: "openai" | "anthropic" | "gateway"; upstream: "openai" | "anthropic" | "gateway_managed"; model: Model };
export type RoutingTraceEvent =
  | { stage: "task"; task: "lead_summary" | "lead_follow_up"; taskVersion: 1 }
  | { stage: "disclosure"; classification: "public" | "platform_internal" | "tenant_confidential" | "restricted";
      cloudPermitted: boolean; localRequired: boolean; localPermitted: boolean; cloudFallbackPermitted: boolean; recipients: Recipient[] }
  | { stage: "constraints"; preferredLane: "local_routine" | "local_specialist" | "cloud_standard" | "cloud_reasoning" | "exact_observation";
      fallbackPermitted: boolean; escalationPermitted: boolean; maxAttempts: number; capability: "routine" | "specialist_coding" | "reasoning";
      grounding: "authorised_context" | "none"; output: "text" | "structured"; latencyClass: "interactive" | "background"; contextBudgetTokens: number }
  | { stage: "certification"; index: number; transport: Recipient["transport"]; model: Model; reason: "policy_certified" | "uncertified_candidate" }
  | { stage: "candidate"; index: number; transport: Recipient["transport"]; model: Model;
      reason: "recipient_not_permitted" | "capability_mismatch" | "lane_not_permitted" | "eligible_primary" | "eligible_fallback" | "eligible_attempt_limit" }
  | { stage: "outcome"; category: "allowed" | "policy_rejection" | "technical_unavailability" | "invalid_request";
      reason: "approved_cloud_plan" | "approved_local_plan" | "invalid_request" | "tenant_mismatch" | "policy_denied" | "context_exceeded" |
        "local_required_lane_mismatch" | "local_fallback_forbidden" | "specialist_unavailable" | "no_available_certified_deployments" |
        "no_permitted_deployments" | "capability_unavailable" | "lane_not_permitted" | "local_recipient_not_approved" | "local_approval_unavailable" }
  | { stage: "output_budget"; maxOutputTokens: number }
  | { stage: "local_approval"; policyVersion: number }
  | { stage: "selection"; index: number; reason: "transport_selected" };
export type RoutingTraceObserver = (event: Readonly<RoutingTraceEvent>) => void | Promise<void>;

const enums: Record<string, readonly unknown[]> = {
  task: ["lead_summary", "lead_follow_up"], taskVersion: [1], classification: ["public", "platform_internal", "tenant_confidential", "restricted"],
  preferredLane: ["local_routine", "local_specialist", "cloud_standard", "cloud_reasoning", "exact_observation"],
  capability: ["routine", "specialist_coding", "reasoning"], grounding: ["authorised_context", "none"], output: ["text", "structured"],
  latencyClass: ["interactive", "background"], transport: ["openai", "anthropic", "gateway"], upstream: ["openai", "anthropic", "gateway_managed"],
  model: [...models, null], category: ["allowed", "policy_rejection", "technical_unavailability", "invalid_request"],
};
const schemas = {
  task: { fields: ["task", "taskVersion"] },
  disclosure: { fields: ["classification", "cloudPermitted", "localRequired", "localPermitted", "cloudFallbackPermitted", "recipients"] },
  constraints: { fields: ["preferredLane", "fallbackPermitted", "escalationPermitted", "maxAttempts", "capability", "grounding", "output", "latencyClass", "contextBudgetTokens"] },
  certification: { fields: ["index", "transport", "model", "reason"], reasons: ["policy_certified", "uncertified_candidate"] },
  candidate: { fields: ["index", "transport", "model", "reason"], reasons: ["recipient_not_permitted", "capability_mismatch", "lane_not_permitted", "eligible_primary", "eligible_fallback", "eligible_attempt_limit"] },
  outcome: { fields: ["category", "reason"], reasons: ["approved_cloud_plan", "approved_local_plan", "invalid_request", "tenant_mismatch", "policy_denied", "context_exceeded", "local_required_lane_mismatch", "local_fallback_forbidden", "specialist_unavailable", "no_available_certified_deployments", "no_permitted_deployments", "capability_unavailable", "lane_not_permitted", "local_recipient_not_approved", "local_approval_unavailable"] },
  output_budget: { fields: ["maxOutputTokens"] },
  local_approval: { fields: ["policyVersion"] }, selection: { fields: ["index", "reason"], reasons: ["transport_selected"] },
} satisfies Record<string, { fields: string[]; reasons?: string[] }>;
function fail(): never { throw new Error("Invalid routing evidence"); }
function record(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== fields.length || fields.some((key) => !descriptors[key] || !("value" in descriptors[key]))) return fail();
  return value as Record<string, unknown>;
}
function field(key: string, value: unknown): unknown {
  if (enums[key]) { if (!enums[key].includes(value)) return fail(); return value; }
  if (["index", "policyVersion", "maxAttempts", "contextBudgetTokens", "maxOutputTokens"].includes(key)) {
    if (!Number.isSafeInteger(value) || (value as number) < (key === "index" ? 0 : 1) || (value as number) > 1_000_000) return fail();
    if (key === "maxAttempts" && (value as number) > 3) return fail();
    if (key === "maxOutputTokens" && (value as number) > 1200) return fail();
    if (key === "contextBudgetTokens" && (value as number) > 4096) return fail();
    return value;
  }
  if (key === "recipients") {
    if (!Array.isArray(value) || value.length > 8) return fail();
    return Object.freeze(Array.from(value, (raw) => {
      const recipient = record(raw, ["transport", "upstream", "model"]);
      if ((recipient.transport === "openai" && recipient.upstream !== "openai") ||
          (recipient.transport === "anthropic" && recipient.upstream !== "anthropic") ||
          (recipient.transport === "gateway" && recipient.upstream !== "gateway_managed")) return fail();
      return Object.freeze({ transport: field("transport", recipient.transport), upstream: field("upstream", recipient.upstream), model: field("model", recipient.model) });
    }));
  }
  if (typeof value !== "boolean") return fail();
  return value;
}
/** Strict copying rejects unknown fields, accessors, sparse arrays and arbitrary strings. */
export function copyRoutingTraceEvent(value: unknown): Readonly<RoutingTraceEvent> {
  if (!value || typeof value !== "object") return fail();
  const stage = Object.getOwnPropertyDescriptor(value, "stage")?.value;
  if (typeof stage !== "string" || !Object.hasOwn(schemas, stage)) return fail();
  const schema: { fields: string[]; reasons?: string[] } = schemas[stage as keyof typeof schemas];
  const raw = record(value, ["stage", ...schema.fields]);
  const copy: Record<string, unknown> = { stage };
  for (const key of schema.fields) {
    if (key === "reason") { if (!schema.reasons?.includes(raw[key] as string)) return fail(); copy[key] = raw[key]; }
    else copy[key] = field(key, raw[key]);
  }
  if (stage === "disclosure" && ((!copy.cloudPermitted && ((copy.recipients as unknown[]).length || copy.cloudFallbackPermitted)) ||
      (copy.localRequired && copy.cloudPermitted) || (copy.classification === "restricted" && !copy.localRequired))) return fail();
  return Object.freeze(copy) as Readonly<RoutingTraceEvent>;
}
/** Lazy construction and observer failures are contained; no errors or payloads are logged. */
export function observeRouting(observer: RoutingTraceObserver | undefined, construct: () => RoutingTraceEvent): void {
  if (!observer) return;
  try {
    const result = observer(copyRoutingTraceEvent(construct()));
    if (result instanceof Promise) void result.catch(() => {});
  } catch { /* Evidence must never become routing authority. */ }
}
