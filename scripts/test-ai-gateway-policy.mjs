import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import { aiGatewayGenerate } from "../packages/platform-core/src/ai/gateway.ts";
import { crmDisclosurePolicy, crmExecutionPolicy, CRM_APPROVED_RECIPIENT, intersectDisclosure,
  resolveAiRouting, validateExactObservation, describeAiDeployments } from "../packages/platform-core/src/ai/policy.ts";
import { llmChat } from "../packages/platform-core/src/ai/llm.ts";

const names = ["OPENAI_API_KEY", "OPENAI_MODEL", "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "ANTHROPIC_API_KEY", "DG_LLM_PROVIDER", "DG_LLM_GATEWAY_MODEL", "DG_LLM_GATEWAY_REASONING_MODEL", "ANTHROPIC_MODEL"];
let saved;
beforeEach((t) => {
  saved = Object.fromEntries(names.map((n) => [n, process.env[n]]));
  names.forEach((n) => delete process.env[n]);
  process.env.OPENAI_API_KEY = "fake-key";
  process.env.AI_GATEWAY_API_KEY = "fake-key";
  process.env.ANTHROPIC_API_KEY = "fake-key";
  t.mock.method(globalThis, "fetch", () => { throw new Error("unexpected network"); });
});
afterEach(() => names.forEach((n) => saved[n] === undefined ? delete process.env[n] : process.env[n] = saved[n]));
const local = () => ({ version: 1, classification: "restricted", cloudPermitted: false, approvedRecipients: [], localRequired: true, cloudFallbackPermitted: false });
const req = () => ({ organisationId: "org_a", businessContext: { organisationId: "org_a" },
  actor: { type: "user", id: "user_a" }, correlationId: "req_a", task: "lead_summary", maxTokens: 1200,
  disclosurePolicy: crmDisclosurePolicy(), executionPolicy: crmExecutionPolicy(),
  authorisedInput: { organisationId: "org_a", messages: [{ role: "user", content: "PRIVATE_CONTACT" }], disclosure: crmDisclosurePolicy(),
    evidence: [{ organisationId: "org_a", source: "crm", disclosure: crmDisclosurePolicy() }] } });
async function rejected(change, code) {
  const input = req(); change(input);
  let calls = 0;
  const events = [];
  await assert.rejects(aiGatewayGenerate(input, { chat: async () => { calls++; throw new Error("unexpected inference"); }, record: async (e) => events.push(e) }), { code });
  assert.equal(calls, 0);
  assert.doesNotMatch(JSON.stringify(events), /PRIVATE_CONTACT|unexpected inference/);
}
const otherRecipients = [
  { transport: "gateway", upstream: "gateway_managed", model: "openai/gpt-5.4-mini" },
  { transport: "anthropic", upstream: "anthropic", model: "claude-sonnet-4-20250514" },
  { transport: "openai", upstream: "openai", model: "gpt-4o" },
];
test("cross-tenant input makes zero inference calls", () => rejected((r) => r.authorisedInput.organisationId = "org_b", "tenant_mismatch"));
test("cross-tenant evidence makes zero inference calls", () => rejected((r) => r.authorisedInput.evidence[0].organisationId = "org_b", "tenant_mismatch"));
test("unknown task fails closed", () => rejected((r) => r.task = "advisor_answer", "invalid_request"));
test("malformed and unknown policy classifications fail closed", async () => {
  for (const classification of ["internal", "secret", undefined, null, {}, "__proto__"])
    await rejected((r) => r.disclosurePolicy.classification = classification, "policy_denied");
  for (const change of [(r) => r.disclosurePolicy.version = 2, (r) => r.disclosurePolicy.cloudPermitted = "true", (r) => r.disclosurePolicy.extra = "secret"])
    await rejected(change, "policy_denied");
});
for (const classification of ["public", "platform_internal"]) {
  test(`${classification} classification alone grants no cloud access`, () => rejected((r) => {
    r.disclosurePolicy = { version: 1, classification, cloudPermitted: false, approvedRecipients: [], localRequired: false, cloudFallbackPermitted: false };
  }, "policy_denied"));
}
test("tenant confidential only permits independently approved direct model", () => {
  const policy = { ...crmDisclosurePolicy(), approvedRecipients: [CRM_APPROVED_RECIPIENT, ...otherRecipients] };
  assert.deepEqual(intersectDisclosure([policy], "tenant_confidential").approvedRecipients, [CRM_APPROVED_RECIPIENT]);
});
for (const recipient of otherRecipients) {
  test(`confidential denies alternate recipient ${recipient.transport}/${recipient.model}`, () => rejected((r) => {
    r.disclosurePolicy.approvedRecipients = [recipient];
  }, "policy_denied"));
}
test("restricted makes zero cloud calls", () => rejected((r) => r.disclosurePolicy = local(), "local_transport_unavailable"));
test("local requirement makes zero cloud calls", () => rejected((r) => r.disclosurePolicy = { ...local(), classification: "tenant_confidential" }, "local_transport_unavailable"));
test("restricted evidence overrides permissive request", () => rejected((r) => r.authorisedInput.evidence[0].disclosure = local(), "local_transport_unavailable"));
test("restricted payload overrides permissive request", () => rejected((r) => r.authorisedInput.disclosure = local(), "local_transport_unavailable"));
test("caller cannot lower registered CRM classification or remove grounding", async () => {
  const r = req();
  for (const p of [r.disclosurePolicy, r.authorisedInput.disclosure, r.authorisedInput.evidence[0].disclosure]) p.classification = "public";
  const plan = resolveAiRouting({ ...r, deployments: describeAiDeployments([{ provider: "openai", model: "gpt-4o-mini" }]) });
  assert.equal(plan.disclosure.classification, "tenant_confidential");
  await rejected((r) => r.executionPolicy.requirements = { grounding: "none" }, "policy_denied");
  await rejected((r) => r.executionPolicy.requirements = { contextBudgetTokens: 8192 }, "policy_denied");
});
test("empty disclosure intersection makes zero calls", () => rejected((r) => r.authorisedInput.disclosure.approvedRecipients = [], "policy_denied"));
test("Gateway transport cannot claim approved OpenAI upstream", () => rejected((r) => r.disclosurePolicy.approvedRecipients = [{ transport: "gateway", upstream: "openai", model: "gpt-4o-mini" }], "policy_denied"));
test("reasoning cannot silently fall back to standard", () => rejected((r) => {
  r.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "cloud_reasoning", fallbackPermitted: true, escalationPermitted: true, requirements: { capability: "reasoning" } };
}, "capability_unavailable"));
test("specialist capability cannot silently use routine deployment", () => rejected((r) => {
  r.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "local_specialist", fallbackPermitted: true, requirements: { capability: "specialist_coding" } };
  r.disclosurePolicy.cloudFallbackPermitted = r.authorisedInput.disclosure.cloudFallbackPermitted = r.authorisedInput.evidence[0].disclosure.cloudFallbackPermitted = true;
}, "capability_unavailable"));
test("local routine requires explicit local permission and never falls back to cloud", () => {
  const fallback = req();
  fallback.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "local_routine", fallbackPermitted: true, localDeploymentId: "dep_test" };
  assert.throws(() => resolveAiRouting({ ...fallback, deployments: describeAiDeployments([{ provider: "openai", model: "gpt-4o-mini" }]) }), { code: "local_transport_unavailable" });
  const local = req();
  local.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "local_routine", localDeploymentId: "dep_test" };
  const decision = resolveAiRouting({ ...local, deployments: describeAiDeployments([{ provider: "openai", model: "gpt-4o-mini" }]) });
  assert.equal(decision.reason, "approved_local_plan");
  assert.deepEqual(decision.plan, []);
  assert.equal(decision.localDeploymentId, "dep_test");
  local.authorisedInput.evidence[0].disclosure.localPermitted = false;
  assert.throws(() => resolveAiRouting({ ...local, deployments: [] }), { code: "policy_denied" });
});
test("restricted requests can route only to explicitly local-required routine", () => {
  const r = req();
  r.disclosurePolicy = local();
  r.authorisedInput.disclosure = local();
  r.authorisedInput.evidence[0].disclosure = local();
  r.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "local_routine", localDeploymentId: "dep_test" };
  const decision = resolveAiRouting({ ...r, deployments: [] });
  assert.equal(decision.disclosure.classification, "restricted");
  assert.equal(decision.disclosure.cloudPermitted, false);
  assert.equal(decision.reason, "approved_local_plan");
});
test("malformed local deployment hint fails closed", () => {
  const r = req();
  r.executionPolicy = { ...crmExecutionPolicy(), preferredLane: "local_routine", localDeploymentId: "https://attacker.invalid" };
  assert.throws(() => resolveAiRouting({ ...r, deployments: [] }), { code: "policy_denied" });
});
const exact = () => ({ target: CRM_APPROVED_RECIPIENT, plan: [CRM_APPROVED_RECIPIENT], grounding: "none", escalationPermitted: false });
test("exact observation accepts only a single exact direct recipient", () => assert.doesNotThrow(() => validateExactObservation(exact())));
test("exact observation forbids provider/model substitution or additional fallback", () => {
  for (const plan of [[otherRecipients[1]], [otherRecipients[2]], [CRM_APPROVED_RECIPIENT, otherRecipients[2]], []])
    assert.throws(() => validateExactObservation({ ...exact(), plan }), { code: "policy_denied" });
});
test("exact observation forbids escalation", () => assert.throws(() => validateExactObservation({ ...exact(), escalationPermitted: true }), { code: "policy_denied" }));
test("exact observation forbids added grounding", () => assert.throws(() => validateExactObservation({ ...exact(), grounding: "authorised_context" }), { code: "policy_denied" }));
test("observation invariant is not a migrated task", () => rejected((r) => r.executionPolicy.preferredLane = "exact_observation", "policy_denied"));
test("context overflow rejects intact input and never escalates disclosure", async () => {
  await rejected((r) => r.authorisedInput.messages[0].content = "PRIVATE_CONTACT".repeat(1000), "context_exceeded");
  const r = req(); r.authorisedInput.messages[0].content = "x".repeat(5000);
  const before = structuredClone(r);
  assert.throws(() => resolveAiRouting({ ...r, deployments: [] }), { code: "context_exceeded" });
  assert.deepEqual(r, before);
});
test("cancellation after failed attempt prevents later eligible attempt", async (t) => {
  const controller = new AbortController(); let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls++; controller.abort(); return Response.json({}, { status: 429 }); });
  await assert.rejects(llmChat({ messages: [{ role: "user", content: "public" }], safeErrors: true, signal: controller.signal,
    executionPlan: [{ provider: "gateway", model: "openai/gpt-5.4-mini" }, { provider: "openai", model: "gpt-4o-mini" }] }));
  assert.equal(calls, 1);
});
test("transport plan validates every candidate before first disclosure", async (t) => {
  let calls = 0; t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("unexpected"); });
  await assert.rejects(llmChat({ messages: [{ role: "user", content: "PRIVATE_CONTACT" }],
    executionPlan: [{ provider: "openai", model: "gpt-4o-mini" }, { provider: "anthropic", model: "unapproved" }] }));
  assert.equal(calls, 0);
});

test("local required remains terminal even for oversized input", () => rejected((r) => {
  r.disclosurePolicy = local(); r.authorisedInput.messages[0].content = "PRIVATE_CONTACT".repeat(1000);
}, "local_transport_unavailable"));

test("deadline exhaustion prevents a second constrained transport attempt", async (t) => {
  const signal = AbortSignal.timeout(10); let calls = 0;
  t.mock.method(globalThis, "fetch", (_url, options) => {
    calls++;
    return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new Error("PRIVATE_CONTACT")), { once: true }));
  });
  // Keep an ordinary timer alive: AbortSignal.timeout uses an unreferenced timer.
  const keeper = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(llmChat({ messages: [{ role: "user", content: "public" }], safeErrors: true, signal,
      executionPlan: [{ provider: "gateway", model: "openai/gpt-5.4-mini" }, { provider: "openai", model: "gpt-4o-mini" }] }));
    assert.equal(calls, 1);
    assert.equal(signal.aborted, true);
  } finally { clearTimeout(keeper); }
});

test("null execution requirements and sparse envelopes fail closed", async () => {
  await rejected((r) => r.executionPolicy.requirements = null, "policy_denied");
  await rejected((r) => r.authorisedInput.messages = new Array(1), "invalid_request");
  await rejected((r) => r.authorisedInput.evidence = new Array(1), "tenant_mismatch");
});

test("sparse recipient approval and constrained attempt plans are rejected before inference", async (t) => {
  await rejected((r) => r.disclosurePolicy.approvedRecipients = new Array(1), "policy_denied");
  let calls = 0; t.mock.method(globalThis, "fetch", async () => { calls++; throw new Error("unexpected"); });
  const plan = new Array(2); plan[0] = { provider: "openai", model: "gpt-4o-mini" };
  await assert.rejects(llmChat({ messages: [{ role: "user", content: "PRIVATE_CONTACT" }], executionPlan: plan }));
  assert.equal(calls, 0);
});
