/** Internal pure formatter; deliberately absent from runtime and public barrels. */
import { MODEL_REGISTRY, validateModelRegistry } from "./model-registry";
import { copyRoutingTraceEvent, ROUTING_TRACE_VERSION, type RoutingTraceEvent } from "./routing-trace";

export type RoutingDecisionEvidence = Readonly<{
  version: 1;
  provenance: Readonly<{
    policyVersion: 1;
    policySource: "packages/platform-core/src/ai/policy.ts";
    disclosureAuthority: "intersectDisclosure";
    routingAuthority: "resolveAiRouting";
    registryVersion: 1;
    registryCertification: "current" | "unavailable";
  }>;
  /** Ordered observations, not a replay, approval, or claim of provider execution. */
  events: readonly Readonly<RoutingTraceEvent>[];
}>;
/** Explicit time is reproducible. Expired certification never controls runtime routing. */
export function buildRoutingDecisionEvidence(events: readonly unknown[], at: string): RoutingDecisionEvidence {
  if (!Array.isArray(events) || events.length > 128) throw new Error("Invalid routing evidence");
  const copied = Array.from(events, copyRoutingTraceEvent);
  // One decision per envelope; never turn partial or mixed traces into complete evidence.
  const positions = (stage: RoutingTraceEvent["stage"]) => copied.flatMap((event, index) => event.stage === stage ? [index] : []);
  const tasks = positions("task"), disclosures = positions("disclosure"), outcomes = positions("outcome");
  const constraints = positions("constraints"), budgets = positions("output_budget"), selections = positions("selection");
  if (tasks.length !== 1 || disclosures.length !== 1 || outcomes.length !== 1 || tasks[0] >= disclosures[0] || disclosures[0] >= outcomes[0] ||
      constraints.length > 1 || budgets.length > 1 || selections.length > 1 || positions("local_approval").length > 1 ||
      constraints.some((index) => index <= disclosures[0] || index >= outcomes[0]) ||
      budgets.some((index) => !constraints.length || index <= constraints[0] || index >= outcomes[0]) ||
      selections.some((index) => index <= outcomes[0])) throw new Error("Incomplete routing evidence");
  const outcome = copied[outcomes[0]];
  if (outcome.stage === "outcome" && outcome.category === "allowed" &&
      (constraints.length !== 1 || budgets.length !== 1 || !["approved_cloud_plan", "approved_local_plan"].includes(outcome.reason))) {
    throw new Error("Incomplete routing evidence");
  }
  let registryCertification: "current" | "unavailable" = "unavailable";
  try { validateModelRegistry(MODEL_REGISTRY, at); registryCertification = "current"; } catch { /* Descriptive only. */ }
  return Object.freeze({ version: ROUTING_TRACE_VERSION, provenance: Object.freeze({ policyVersion: 1,
    policySource: "packages/platform-core/src/ai/policy.ts", disclosureAuthority: "intersectDisclosure",
    routingAuthority: "resolveAiRouting", registryVersion: MODEL_REGISTRY.version, registryCertification }), events: Object.freeze(copied) });
}
