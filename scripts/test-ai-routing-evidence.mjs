import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { describeAiDeployments, resolveAiRouting, crmDisclosurePolicy, crmExecutionPolicy } from "../packages/platform-core/src/ai/policy.ts";
import { buildRoutingDecisionEvidence } from "../packages/platform-core/src/ai/routing-evidence.ts";
import { observeRouting, copyRoutingTraceEvent } from "../packages/platform-core/src/ai/routing-trace.ts";
const configured = [
  { provider: "gateway", model: "openai/gpt-5.4-mini" },
  { provider: "anthropic", model: "claude-sonnet-4-20250514" },
  { provider: "openai", model: "gpt-4o-mini" },
];
const request = () => ({ organisationId: "synthetic_tenant", task: "lead_summary", maxTokens: 1200,
  authorisedInput: { organisationId: "synthetic_tenant", messages: [{ role: "user", content: "SYNTHETIC_PRIVATE person@example.invalid 0412345678" }],
    disclosure: crmDisclosurePolicy(), evidence: [] }, disclosurePolicy: crmDisclosurePolicy(), executionPolicy: crmExecutionPolicy(),
  deployments: describeAiDeployments(configured) });
const at = "2026-10-09T12:00:00.000Z";
function trace(input = request()) {
  const events = [];
  const before = structuredClone(input);
  let decision, error;
  try { decision = resolveAiRouting(input, (e) => events.push(e)); } catch (e) { error = e; }
  assert.deepEqual(input, before);
  return { events, decision, error, evidence: buildRoutingDecisionEvidence(events, at) };
}
const candidates = (events) => events.filter((e) => e.stage === "candidate");
const outcome = (events) => events.findLast((e) => e.stage === "outcome");
test("confidential CRM intersection excludes other certified recipients and records constraints", () => {
  const input = request();
  input.disclosurePolicy.approvedRecipients = configured.map((d) => ({ transport: d.provider, upstream: d.provider === "gateway" ? "gateway_managed" : d.provider, model: d.model }));
  const { decision, events, evidence } = trace(input);
  assert.deepEqual(decision.plan, [input.deployments[2]]);
  assert.deepEqual(candidates(events).map((e) => e.reason), ["recipient_not_permitted", "recipient_not_permitted", "eligible_primary"]);
  assert.deepEqual(events.find((e) => e.stage === "disclosure").recipients, [crmDisclosurePolicy().approvedRecipients[0]]);
  assert.equal(events.find((e) => e.stage === "constraints").contextBudgetTokens, 4096);
  assert.equal(evidence.version, 1);
  assert.equal(evidence.provenance.policyVersion, 1);
  assert.equal(evidence.provenance.registryVersion, 1);
  assert.equal(evidence.provenance.registryCertification, "current");
});
test("restricted local selection never evaluates or enables cloud candidates", () => {
  const input = request();
  input.disclosurePolicy = { version: 1, classification: "restricted", cloudPermitted: false, approvedRecipients: [], localRequired: true, cloudFallbackPermitted: false };
  input.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "local_routine", localDeploymentId: "synthetic_deployment" };
  const { decision, events } = trace(input);
  assert.deepEqual(decision.plan, []);
  assert.equal(decision.reason, "approved_local_plan");
  assert.equal(events.find((e) => e.stage === "disclosure").classification, "restricted");
  assert.deepEqual(candidates(events), []);
  input.executionPolicy.preferredLane = "cloud_standard";
  delete input.executionPolicy.localDeploymentId;
  const rejected = trace(input);
  assert.equal(rejected.error.code, "local_transport_unavailable");
  assert.equal(outcome(rejected.events).category, "policy_rejection");
});
test("uncertified candidate exclusion retains configured index and redacts arbitrary model names", () => {
  const events = [];
  const result = describeAiDeployments([{ provider: "openai", model: "SYNTHETIC_PRIVATE" }, ...configured], (e) => events.push(e));
  assert.deepEqual(result, describeAiDeployments(configured));
  assert.deepEqual(events[0], { stage: "certification", index: 0, transport: "openai", model: null, reason: "uncertified_candidate" });
  assert.deepEqual(events.slice(1).map((e) => e.index), [1, 2, 3]);
  assert.doesNotMatch(JSON.stringify(events), /SYNTHETIC_PRIVATE/);
});
test("technical absence and recipient rejection preserve the same existing error but distinct evidence", () => {
  const unavailable = request(); unavailable.deployments = [];
  const denied = request(); denied.deployments = denied.deployments.slice(0, 2);
  const a = trace(unavailable), b = trace(denied);
  assert.equal(a.error.code, "policy_denied"); assert.equal(b.error.code, "policy_denied");
  assert.deepEqual(outcome(a.events), { stage: "outcome", category: "technical_unavailability", reason: "no_available_certified_deployments" });
  assert.deepEqual(outcome(b.events), { stage: "outcome", category: "policy_rejection", reason: "no_permitted_deployments" });
  const capability = request(); capability.executionPolicy.requirements = { capability: "reasoning" };
  const c = trace(capability);
  assert.equal(c.error.code, "capability_unavailable");
  assert.equal(outcome(c.events).category, "technical_unavailability");
});
test("candidate order, attempt cap and fallback plan are unchanged by observation", () => {
  // Duplicate approved deployments are synthetic ordering fixtures, not new model approvals.
  const input = request(); input.deployments = [input.deployments[2], { ...input.deployments[2] }, { ...input.deployments[2] }];
  input.disclosurePolicy.cloudFallbackPermitted = input.authorisedInput.disclosure.cloudFallbackPermitted = true;
  input.executionPolicy = { ...crmExecutionPolicy(), fallbackPermitted: true, maxAttempts: 2 };
  input.deployments[1] = input.deployments[0]; // Repeated object identity still occupies its own ordered slot.
  const baseline = resolveAiRouting(input);
  const observed = trace(input);
  assert.deepEqual(observed.decision, baseline);
  assert.deepEqual(candidates(observed.events).map((e) => e.reason), ["eligible_primary", "eligible_fallback", "eligible_attempt_limit"]);
  assert.deepEqual(candidates(observed.events).map((e) => e.index), [0, 1, 2]);
});
test("expired registry certification is descriptive and never affects inference plan", () => {
  const { events, decision } = trace();
  const evidence = buildRoutingDecisionEvidence(events, "2027-01-07T00:00:00.000Z");
  assert.equal(evidence.provenance.registryCertification, "unavailable");
  assert.deepEqual(resolveAiRouting(request()), decision);
  for (const path of ["policy.ts", "gateway.ts", "llm.ts", "routing-trace.ts"]) {
    assert.doesNotMatch(readFileSync(new URL(`../packages/platform-core/src/ai/${path}`, import.meta.url), "utf8"), /model-registry|routing-evidence/);
  }
});
test("malformed evidence and unsupported classifications fail closed without echoing data", () => {
  for (const raw of [null, {}, { stage: "task", task: "unsupported", taskVersion: 1 },
    { stage: "task", task: "lead_summary", taskVersion: 1, prompt: "SYNTHETIC_PRIVATE" },
    { stage: "local_approval", policyVersion: NaN },
    Object.create({ stage: "local_approval", policyVersion: 1 })]) {
    assert.throws(() => copyRoutingTraceEvent(raw), { message: "Invalid routing evidence" });
  }
  assert.throws(() => buildRoutingDecisionEvidence(new Array(1), at));
  assert.throws(() => buildRoutingDecisionEvidence([], at));
  const valid = trace().events;
  assert.throws(() => buildRoutingDecisionEvidence(valid.filter((e) => e.stage !== "outcome"), at));
  assert.throws(() => buildRoutingDecisionEvidence([...valid, ...valid], at));
  assert.throws(() => buildRoutingDecisionEvidence(valid.filter((e) => e.stage !== "constraints"), at));
  const input = request(); input.disclosurePolicy.classification = "unsupported";
  const events = [];
  assert.throws(() => resolveAiRouting(input, (e) => events.push(e)), { code: "policy_denied" });
  assert.throws(() => buildRoutingDecisionEvidence(events, at));
  let accessed = false;
  assert.throws(() => copyRoutingTraceEvent({ stage: "local_approval", get policyVersion() { accessed = true; return 1; } }));
  assert.equal(accessed, false);
});
test("allowlisted snapshots exclude customer data and cannot mutate routing inputs", () => {
  const input = request();
  const events = [];
  const decision = resolveAiRouting(input, (e) => {
    events.push(e);
    if (e.stage === "disclosure") e.recipients.push({ model: "SYNTHETIC_PRIVATE" });
    else e.stage = "SYNTHETIC_PRIVATE";
  });
  assert.deepEqual(decision, resolveAiRouting(request()));
  const evidence = buildRoutingDecisionEvidence(events, at);
  assert.doesNotMatch(JSON.stringify(evidence), /SYNTHETIC_PRIVATE|person@|0412345678|synthetic_tenant|messages|content|apiKey|credentials/);
  assert.ok(Object.isFrozen(evidence.events));
});
test("construction and observer failure isolation preserve successful and rejected routing", () => {
  observeRouting(() => assert.fail("must not be called"), () => { throw new Error("SYNTHETIC_PRIVATE"); });
  observeRouting(() => assert.fail("must not be called"), () => ({ stage: "local_approval", policyVersion: "SYNTHETIC_PRIVATE" }));
  assert.deepEqual(resolveAiRouting(request(), () => { throw new Error("SYNTHETIC_PRIVATE"); }), resolveAiRouting(request()));
  assert.deepEqual(describeAiDeployments(configured, () => { throw new Error("SYNTHETIC_PRIVATE"); }), describeAiDeployments(configured));
  const input = request(); input.deployments = [];
  assert.throws(() => resolveAiRouting(input, () => { throw new Error("SYNTHETIC_PRIVATE"); }), { code: "policy_denied" });
});
