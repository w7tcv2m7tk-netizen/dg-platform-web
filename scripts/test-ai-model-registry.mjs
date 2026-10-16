import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { MODEL_REGISTRY, ModelRegistryError, validateModelRegistry, findCertifiedModelDeployment } from "../packages/platform-core/src/ai/model-registry.ts";
import { describeAiDeployments, resolveAiRouting, crmDisclosurePolicy, crmExecutionPolicy } from "../packages/platform-core/src/ai/policy.ts";

const at = "2026-10-09T12:00:00.000Z";
const copy = () => structuredClone(MODEL_REGISTRY);
const target = (entry = MODEL_REGISTRY.entries[0]) => ({ deploymentId: entry.deploymentId,
  transport: entry.transport, model: entry.model, lane: entry.lane, task: "lead_summary" });
function invalid(change) {
  const registry = copy(); change(registry);
  assert.throws(() => validateModelRegistry(registry, at), ModelRegistryError);
}

test("snapshot represents exactly the existing policy-certified cloud deployments", () => {
  validateModelRegistry(MODEL_REGISTRY, at);
  assert.deepEqual(MODEL_REGISTRY.entries.map((entry) => ({ transport: entry.transport, model: entry.model,
    upstream: entry.upstream, lane: entry.lane, capability: entry.capability })),
  describeAiDeployments(MODEL_REGISTRY.entries.map((entry) => ({ provider: entry.transport, model: entry.model }))));
  for (const entry of MODEL_REGISTRY.entries) {
    for (const task of ["lead_summary", "lead_follow_up"]) {
      assert.equal(findCertifiedModelDeployment(MODEL_REGISTRY, { ...target(entry), task }, at), entry);
    }
    assert.equal(entry.certification.kind, "repository_contract");
    assert.equal(entry.pricingReference, undefined);
    assert.equal(entry.evaluationReference, undefined);
  }
});
test("snapshot and nested evidence/contracts are immutable", () => {
  assert.throws(() => { MODEL_REGISTRY.entries[0].model = "other"; }, TypeError);
  assert.throws(() => { MODEL_REGISTRY.entries[0].contracts[0].task = "other"; }, TypeError);
  assert.throws(() => { MODEL_REGISTRY.entries[0].certification.reviewBy = at; }, TypeError);
  assert.throws(() => MODEL_REGISTRY.entries.push(MODEL_REGISTRY.entries[0]), TypeError);
});
test("validated subsets, empty registry and bounded contracts are safe", () => {
  validateModelRegistry({ version: 1, entries: [] }, at);
  const registry = copy(); registry.entries = [registry.entries[0]];
  registry.entries[0].contracts = [registry.entries[0].contracts[0]];
  registry.entries[0].contracts[0].contextBudgetTokens = 1000;
  registry.entries[0].contracts[0].maxOutputTokens = 100;
  registry.entries[0].pricingReference = "catalogue/pricing-v1";
  registry.entries[0].evaluationReference = "evaluations/crm-v1";
  validateModelRegistry(registry, at);
  assert.throws(() => findCertifiedModelDeployment(registry, { ...target(), task: "lead_follow_up" }, at), ModelRegistryError);
});

const mutations = {
  "unknown model": (e) => { e.model = "gpt-unreviewed"; },
  "unknown stable identity": (e) => { e.modelId = "openai:unknown"; },
  "unknown deployment": (e) => { e.deploymentId = "cloud:openai:unknown"; },
  "another deployment's identity": (e) => { e.deploymentId = MODEL_REGISTRY.entries[1].deploymentId; },
  "incorrect transport": (e) => { e.transport = "gateway"; },
  "incorrect provider": (e) => { e.provider = "anthropic"; },
  "incorrect upstream": (e) => { e.upstream = "gateway_managed"; },
  "reasoning lane": (e) => { e.lane = "cloud_reasoning"; },
  "local routine lane": (e) => { e.lane = "local_routine"; },
  "local specialist lane": (e) => { e.lane = "local_specialist"; },
  "observation lane": (e) => { e.lane = "exact_observation"; },
  "reasoning capability": (e) => { e.capability = "reasoning"; },
  "specialist capability": (e) => { e.capability = "specialist_coding"; },
  "unknown lifecycle": (e) => { e.lifecycle = "approved"; },
  "missing certification": (e) => { delete e.certification; },
  "wrong evidence revision": (e) => { e.certification.evidenceRevision = "a".repeat(40); },
  "invented benchmark certification": (e) => { e.certification.kind = "benchmark"; },
  "wrong evidence path": (e) => { e.certification.evidencePath = "other.ts"; },
  "wrong evidence symbol": (e) => { e.certification.evidenceSymbol = "llmChat"; },
  "unreviewed renewal": (e) => { e.certification.reviewBy = "2027-01-08T00:00:00.000Z"; },
  "invalid calendar date": (e) => { e.certification.verifiedAt = "2026-02-30T00:00:00.000Z"; },
  "noncanonical date": (e) => { e.certification.reviewBy = "2027-01-07"; },
  "unknown task": (e) => { e.contracts[0].task = "advisor_answer"; },
  "prototype task name": (e) => { e.contracts[0].task = "__proto__"; },
  "wrong task version": (e) => { e.contracts[0].taskVersion = 2; },
  "structured output": (e) => { e.contracts[0].output = "structured"; },
  "wrong output contract": (e) => { e.contracts[0].resultContract = "crm_text_v2"; },
  "context widening": (e) => { e.contracts[0].contextBudgetTokens = 4097; },
  "output widening": (e) => { e.contracts[0].maxOutputTokens = 1201; },
  "zero context": (e) => { e.contracts[0].contextBudgetTokens = 0; },
  "fractional output": (e) => { e.contracts[0].maxOutputTokens = 1.5; },
  "NaN limit": (e) => { e.contracts[0].contextBudgetTokens = NaN; },
  "empty contracts": (e) => { e.contracts = []; },
  "duplicate contracts": (e) => { e.contracts[1] = e.contracts[0]; },
  "sparse contracts": (e) => { delete e.contracts[0]; },
  "unknown nested approval": (e) => { e.contracts[0].cloudPermitted = true; },
  "metadata recipient approval": (e) => { e.approvedRecipients = []; },
  "metadata tenant approval": (e) => { e.organisationId = "org_a"; },
  "metadata execution approval": (e) => { e.cloudPermitted = true; },
  "invalid reference": (e) => { e.pricingReference = ""; },
  "undefined reference": (e) => { e.evaluationReference = undefined; },
};
for (const [name, mutate] of Object.entries(mutations)) {
  test(`rejects ${name}`, () => invalid((registry) => mutate(registry.entries[0])));
}
test("rejects duplicate deployment and model identities", () => {
  invalid((r) => { r.entries[1] = structuredClone(r.entries[0]); });
  invalid((r) => { r.entries[1].modelId = r.entries[0].modelId; });
});
test("rejects malformed registry envelopes, sparse arrays and inherited fields", () => {
  for (const registry of [null, [], {}, { version: 2, entries: [] }, { version: 1, entries: null },
    { version: 1, entries: [null] }, { version: 1, entries: new Array(1) },
    { version: 1, entries: [], approved: true }, Object.create(MODEL_REGISTRY)]) {
    assert.throws(() => validateModelRegistry(registry, at), ModelRegistryError);
  }
  invalid((r) => { r.entries[0][Symbol("approval")] = true; });
});
test("certification expires exactly at reviewBy and cannot be used before verification", () => {
  validateModelRegistry(MODEL_REGISTRY, "2027-01-06T23:59:59.999Z");
  for (const time of ["2027-01-07T00:00:00.000Z", "2027-02-01T00:00:00.000Z", "2026-10-08T23:59:59.999Z", "bad", "2026-02-30T00:00:00.000Z"]) {
    assert.throws(() => validateModelRegistry(MODEL_REGISTRY, time), ModelRegistryError);
    assert.throws(() => findCertifiedModelDeployment(MODEL_REGISTRY, target(), time), ModelRegistryError);
  }
});
test("lookup rejects unknown, mismatched and non-active deployments", () => {
  for (const change of [{ model: "unknown" }, { deploymentId: "unknown" }, { transport: "anthropic" },
    { lane: "local_routine" }, { task: "advisor_answer" }]) {
    assert.throws(() => findCertifiedModelDeployment(MODEL_REGISTRY, { ...target(), ...change }, at), ModelRegistryError);
  }
  for (const lifecycle of ["deprecated", "retired"]) {
    const registry = copy(); registry.entries[0].lifecycle = lifecycle;
    validateModelRegistry(registry, at);
    assert.throws(() => findCertifiedModelDeployment(registry, target(), at), ModelRegistryError);
  }
});

const request = () => ({ organisationId: "org_a", task: "lead_summary", maxTokens: 1200,
  authorisedInput: { organisationId: "org_a", messages: [{ role: "user", content: "Synthetic CRM evidence" }],
    disclosure: crmDisclosurePolicy(), evidence: [] }, disclosurePolicy: crmDisclosurePolicy(),
  executionPolicy: crmExecutionPolicy(), deployments: describeAiDeployments(MODEL_REGISTRY.entries.map((e) => ({ provider: e.transport, model: e.model }))) });
test("certification never broadens confidential recipient approval", () => {
  const input = request();
  input.disclosurePolicy.approvedRecipients = MODEL_REGISTRY.entries.map(({ transport, upstream, model }) => ({ transport, upstream, model }));
  const decision = resolveAiRouting(input);
  assert.deepEqual(decision.plan.map((e) => e.transport), ["openai"]);
  assert.equal(decision.plan[0].model, "gpt-4o-mini");
  input.deployments = input.deployments.filter((e) => e.transport !== "openai");
  assert.throws(() => resolveAiRouting(input), { code: "policy_denied" });
});
test("certified models cannot overcome tenant, disclosure or configured availability restrictions", () => {
  const tenant = request(); tenant.authorisedInput.organisationId = "org_b";
  assert.throws(() => resolveAiRouting(tenant), { code: "tenant_mismatch" });
  const empty = request(); empty.deployments = [];
  assert.throws(() => resolveAiRouting(empty), { code: "policy_denied" });
  const denied = request(); denied.disclosurePolicy = { ...crmDisclosurePolicy(), cloudPermitted: false, approvedRecipients: [] };
  assert.throws(() => resolveAiRouting(denied), { code: "policy_denied" });
  const restricted = request(); restricted.disclosurePolicy = { version: 1, classification: "restricted",
    cloudPermitted: false, approvedRecipients: [], localRequired: true, cloudFallbackPermitted: false };
  assert.throws(() => resolveAiRouting(restricted), { code: "local_transport_unavailable" });
});
test("registry has no runtime routing import or public barrel export", () => {
  for (const path of ["packages/platform-core/src/ai/policy.ts", "packages/platform-core/src/ai/gateway.ts",
    "packages/platform-core/src/ai/llm.ts", "packages/platform-core/src/ai/index.ts", "packages/platform-core/src/index.ts"]) {
    assert.doesNotMatch(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), /model-registry/);
  }
});
