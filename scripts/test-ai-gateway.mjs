import assert from "node:assert/strict";
import { beforeEach, afterEach, test } from "node:test";
import { aiGatewayGenerate } from "../packages/platform-core/src/ai/gateway.ts";
import { generateAiAssist } from "../packages/platform-core/src/ai/generate.ts";
import { llmChat } from "../packages/platform-core/src/ai/llm.ts";
import { generateFromBusinessContext } from "../packages/platform-core/src/org/business-context.ts";
import { prisma } from "@dg/database";

const ENV_NAMES = [
  "AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
  "DG_LLM_PROVIDER", "DG_LLM_GATEWAY_MODEL", "DG_LLM_GATEWAY_REASONING_MODEL",
  "OPENAI_MODEL", "ANTHROPIC_MODEL", "DATABASE_URL",
];
let savedEnv;
beforeEach((t) => {
  savedEnv = Object.fromEntries(ENV_NAMES.map((name) => [name, process.env[name]]));
  for (const name of ENV_NAMES) delete process.env[name];
  // Test-process-only fake keys. No environment files or real services are used.
  process.env.AI_GATEWAY_API_KEY = "test-gateway-key";
  process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
  process.env.OPENAI_API_KEY = "test-openai-key";
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Unexpected network request"); });
});
afterEach(() => {
  for (const name of ENV_NAMES) {
    if (savedEnv[name] === undefined) delete process.env[name];
    else process.env[name] = savedEnv[name];
  }
});

const PRIVATE_INPUT = "PRIVATE_PROMPT contact@example.invalid 0412345678";
const PRIVATE_OUTPUT = "PRIVATE_MODEL_RESPONSE";
const request = (overrides = {}) => ({
  organisationId: "org_a",
  businessContext: { organisationId: "org_a" },
  actor: { type: "user", id: "user_actor" },
  correlationId: "request_123",
  task: "lead_summary",
  disclosurePolicy: { mode: "cloud_allowed", allowedProviders: ["openai"] },
  messages: [{ role: "user", content: PRIVATE_INPUT }],
  maxTokens: 1200,
  ...overrides,
});
const fakeResult = (overrides = {}) => ({
  text: "A useful lead summary",
  provider: "openai",
  model: "gpt-4o-mini",
  latencyMs: 1,
  ...overrides,
});
const recorder = () => {
  const events = [];
  return { events, record: async (event) => { events.push(event); } };
};
const openaiResponse = (text = "A useful lead summary", usage) => Response.json({
  choices: [{ message: { content: text } }],
  ...(usage === undefined ? {} : { usage }),
});
const failureResponse = () => Response.json({ error: { message: PRIVATE_INPUT } }, { status: 429 });

test("allowed lead_summary reaches only its eligible cloud transport", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    urls.push(url);
    const body = JSON.parse(options.body);
    assert.equal(body.model, "gpt-4o-mini");
    assert.equal(body.max_tokens, 1200);
    assert.equal(body.messages[0].content, PRIVATE_INPUT);
    return openaiResponse();
  });
  const result = await aiGatewayGenerate(request(), recorder());
  assert.deepEqual(urls, ["https://api.openai.com/v1/chat/completions"]);
  assert.equal(result.provider, "openai");
  assert.equal(result.attempts[0].ok, true);
  assert.equal(result.correlationId, "request_123");
});

test("cross-tenant context is rejected before inference", async () => {
  let called = false;
  const ledger = recorder();
  await assert.rejects(aiGatewayGenerate(request({ businessContext: { organisationId: "org_b" } }), {
    ...ledger, chat: async () => { called = true; return fakeResult(); },
  }), { code: "tenant_mismatch" });
  assert.equal(called, false);
  assert.equal(ledger.events[0].organisationId, "org_a");
  assert.doesNotMatch(JSON.stringify(ledger.events), /org_b/);
});

test("local-only, unknown and malformed policies fail closed", async () => {
  for (const [policy, code] of [
    [{ mode: "local_only" }, "local_transport_unavailable"],
    [{ mode: "internal" }, "policy_denied"],
    [{ mode: "restricted" }, "policy_denied"],
    [{ mode: "cloud_allowed", allowedProviders: ["openrouter"] }, "policy_denied"],
    [{ mode: "cloud_allowed", allowedProviders: [] }, "policy_denied"],
    [{ mode: "cloud_allowed" }, "policy_denied"],
    [null, "policy_denied"],
  ]) {
    let called = false;
    await assert.rejects(aiGatewayGenerate(request({ disclosurePolicy: policy }), {
      ...recorder(), chat: async () => { called = true; return fakeResult(); },
    }), { code });
    assert.equal(called, false);
  }
});

test("fallback uses only allowed providers and retains successful attempt metadata", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    urls.push(url);
    return url.includes("ai-gateway") ? failureResponse() : openaiResponse();
  });
  const ledger = recorder();
  const result = await aiGatewayGenerate(request({
    disclosurePolicy: { mode: "cloud_allowed", allowedProviders: ["gateway", "openai"] },
  }), ledger);
  assert.deepEqual(urls, ["https://ai-gateway.vercel.sh/v1/chat/completions", "https://api.openai.com/v1/chat/completions"]);
  assert.deepEqual(result.attempts.map((attempt) => attempt.ok), [false, true]);
  assert.equal(ledger.events[0].result.fallbackUsed, true);
  assert.doesNotMatch(JSON.stringify(ledger.events), /PRIVATE_PROMPT/);
});

test("exhausting an allowlist never falls through to disallowed providers", async (t) => {
  const urls = [];
  const logs = [];
  t.mock.method(console, "warn", (...args) => { logs.push(args); });
  t.mock.method(globalThis, "fetch", async (url) => { urls.push(url); return failureResponse(); });
  const ledger = recorder();
  await assert.rejects(aiGatewayGenerate(request(), ledger), { code: "transport_failed" });
  assert.deepEqual(urls, ["https://api.openai.com/v1/chat/completions"]);
  assert.doesNotMatch(JSON.stringify([...ledger.events, ...logs]), /PRIVATE_PROMPT|contact@example/);
});

test("deadline exhaustion aborts the current transport and prevents further attempts", async (t) => {
  const urls = [];
  let observedSignal;
  t.mock.method(globalThis, "fetch", (url, { signal }) => {
    urls.push(url);
    observedSignal = signal;
    return new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(new Error(PRIVATE_INPUT)), { once: true }));
  });
  const ledger = recorder();
  await assert.rejects(aiGatewayGenerate(request({
    deadlineMs: 10,
    disclosurePolicy: { mode: "cloud_allowed", allowedProviders: ["gateway", "anthropic", "openai"] },
  }), ledger), { code: "deadline_exceeded" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(observedSignal.aborted, true);
  assert.deepEqual(urls, ["https://ai-gateway.vercel.sh/v1/chat/completions"]);
  assert.equal(ledger.events[0].result.outcome, "deadline_exceeded");
});

test("pre-aborted requests do not call transports", async () => {
  const controller = new AbortController();
  controller.abort(PRIVATE_INPUT);
  let called = false;
  await assert.rejects(aiGatewayGenerate(request({ signal: controller.signal }), {
    ...recorder(), chat: async () => { called = true; return fakeResult(); },
  }), { code: "aborted" });
  assert.equal(called, false);
});

test("unresponsive injected transport is bounded by the deadline", async () => {
  await assert.rejects(aiGatewayGenerate(request({ deadlineMs: 10 }), {
    ...recorder(), chat: () => new Promise(() => {}),
  }), { code: "deadline_exceeded" });
});

test("invalid deadlines, task types and token limits are rejected before inference", async () => {
  for (const overrides of [{ deadlineMs: 0 }, { deadlineMs: 20_001 }, { deadlineMs: NaN },
    { maxTokens: 0 }, { task: "contact_summary" }, { actor: { type: "visitor" } }]) {
    let called = false;
    await assert.rejects(aiGatewayGenerate(request(overrides), {
      ...recorder(), chat: async () => { called = true; return fakeResult(); },
    }), { code: "invalid_request" });
    assert.equal(called, false);
  }
});

test("OpenAI and Gateway token usage is captured, including a reported zero", async (t) => {
  t.mock.method(globalThis, "fetch", async () => openaiResponse(PRIVATE_OUTPUT, { prompt_tokens: 42, completion_tokens: 0 }));
  for (const provider of ["openai", "gateway"]) {
    const ledger = recorder();
    const result = await aiGatewayGenerate(request({ disclosurePolicy: { mode: "cloud_allowed", allowedProviders: [provider] } }), ledger);
    assert.deepEqual(result.usage, { tokensIn: 42, tokensOut: 0 });
    assert.equal(ledger.events[0].tokensIn, 42);
    assert.equal(ledger.events[0].tokensOut, 0);
  }
});

test("Anthropic reported usage is captured", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    content: [{ type: "text", text: "A useful summary" }], usage: { input_tokens: 31, output_tokens: 8 },
  }));
  const result = await aiGatewayGenerate(request({ disclosurePolicy: { mode: "cloud_allowed", allowedProviders: ["anthropic"] } }), recorder());
  assert.deepEqual(result.usage, { tokensIn: 31, tokensOut: 8 });
});

test("missing or invalid usage stays unknown rather than zero", async (t) => {
  for (const usage of [undefined, { prompt_tokens: -1, completion_tokens: "12" }]) {
    t.mock.method(globalThis, "fetch", async () => openaiResponse("Summary", usage));
    const ledger = recorder();
    const result = await aiGatewayGenerate(request(), ledger);
    assert.deepEqual(result.usage, { tokensIn: null, tokensOut: null });
    assert.equal(ledger.events[0].tokensIn, null);
    assert.equal(ledger.events[0].tokensOut, null);
  }
});

test("actor, correlation and task reach real ledger storage without raw content", async (t) => {
  const writes = [];
  process.env.DATABASE_URL = "postgresql://test:test@localhost:1/test";
  // Prisma delegates expose dynamic methods with undefined property descriptors;
  // Node's mock.method cannot wrap those. Restore these delegate overrides explicitly.
  const originalActivityCreate = prisma.activity.create;
  const originalAuditCreate = prisma.auditLog.create;
  t.after(() => {
    prisma.activity.create = originalActivityCreate;
    prisma.auditLog.create = originalAuditCreate;
  });
  prisma.activity.create = async ({ data }) => {
    writes.push(data);
    return { ...data, id: "activity_test", createdAt: new Date() };
  };
  prisma.auditLog.create = async ({ data }) => { writes.push(data); return data; };
  t.mock.method(globalThis, "fetch", async () => openaiResponse(PRIVATE_OUTPUT, { prompt_tokens: 40, completion_tokens: 9 }));
  const result = await aiGatewayGenerate(request({ actor: { type: "connector", id: "api_key:key_123" } }));
  assert.equal(result.accounting, "recorded");
  assert.equal(writes.length, 2);
  assert.equal(writes[0].createdBy, "api_key:key_123");
  assert.equal(writes[1].actorType, "connector");
  assert.equal(writes[1].actorId, "api_key:key_123");
  for (const write of writes) {
    assert.equal(write.organisationId, "org_a");
    const metadata = write.metadata ?? write.changes;
    assert.equal(metadata.correlationId, "request_123");
    assert.equal(metadata.result.task, "lead_summary");
    assert.equal(metadata.result.outcome, "success");
    assert.equal(metadata.tokensIn, 40);
  }
  assert.doesNotMatch(JSON.stringify(writes), /PRIVATE_PROMPT|PRIVATE_MODEL_RESPONSE|contact@example|0412345678|test-openai-key/);
});

test("accounting failure does not discard a valid summary or leak database errors", async (t) => {
  const logs = [];
  t.mock.method(console, "warn", (...args) => { logs.push(args); });
  const result = await aiGatewayGenerate(request(), {
    chat: async () => fakeResult(), record: async () => { throw new Error(PRIVATE_INPUT); },
  });
  assert.equal(result.accounting, "failed");
  assert.equal(result.text, "A useful lead summary");
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_PROMPT/);
});

const businessContext = {
  organisationId: "org_a", organisationName: "Test business", locale: "en-AU", currency: "AUD",
  enabledAppIds: [], identity: { businessName: "Test business", locations: [] },
  contact: { social: {} }, brandVoice: {}, twin: { connectedSystems: [], websites: [] },
  profile: null, goals: [], capturedAt: "2026-10-06T00:00:00Z",
};
const lead = { kind: "lead", id: "lead_a", title: "Test lead", contactEmail: "contact@example.invalid" };
const gatewayContext = {
  organisationId: "org_a", actor: { type: "user", id: "user_actor" }, correlationId: "request_123",
  disclosurePolicy: { mode: "cloud_allowed", allowedProviders: ["openai"] },
};

test("lead-summary pilot passes identity and preserves the existing prompt and token limit", async () => {
  let captured;
  const result = await generateAiAssist({ context: businessContext, action: "lead_summary", entity: lead, gatewayContext }, {
    chat: async () => { throw new Error("Must not use the legacy path"); },
    gateway: async (input) => {
      captured = input;
      return aiGatewayGenerate(input, { ...recorder(), chat: async () => fakeResult() });
    },
  });
  assert.equal(result.source, "llm");
  assert.equal(captured.organisationId, "org_a");
  assert.equal(captured.actor.id, "user_actor");
  assert.equal(captured.task, "lead_summary");
  assert.equal(captured.maxTokens, 1200);
  assert.equal(captured.tier, "standard");
  assert.match(captured.messages[1].content, /Summarise this lead for an agent/);
});

test("empty, invalid and oversized lead-summary output retains exact deterministic fallback", async () => {
  const expected = generateFromBusinessContext(businessContext, "lead_summary", lead);
  for (const text of ["", "  ", null, {}, "x".repeat(20_001)]) {
    const result = await generateAiAssist({ context: businessContext, action: "lead_summary", entity: lead, gatewayContext }, {
      gateway: (input) => aiGatewayGenerate(input, { ...recorder(), chat: async () => fakeResult({ text }) }),
    });
    assert.equal(result.source, "template");
    assert.equal(result.output, expected);
    assert.match(result.error, /invalid_output/);
  }
});

test("blocked policy, missing identity and unavailable transports retain lead-summary fallback", async () => {
  const expected = generateFromBusinessContext(businessContext, "lead_summary", lead);
  for (const context of [undefined, { ...gatewayContext, disclosurePolicy: { mode: "local_only" } }, gatewayContext]) {
    const result = await generateAiAssist({ context: businessContext, action: "lead_summary", entity: lead, gatewayContext: context }, {
      gateway: (input) => aiGatewayGenerate(input, { ...recorder(), chat: async () => { throw new Error("Unavailable"); } }),
    });
    assert.equal(result.source, "template");
    assert.equal(result.output, expected);
  }
});

test("existing non-lead-summary actions keep the legacy path and no-provider fallback", async () => {
  for (const action of ["social_post", "email_draft", "briefing", "lead_follow_up", "opportunity_follow_up",
    "opportunity_summary", "contact_follow_up", "contact_summary", "listing_description"]) {
    let calls = 0;
    const deps = {
      configured: () => true,
      gateway: () => { throw new Error("Unexpected gateway migration"); },
      chat: async (input) => { calls++; assert.equal(input.maxTokens, 1200); return fakeResult(); },
    };
    const result = await generateAiAssist({ context: businessContext, action, entity: lead }, deps);
    assert.equal(result.source, "llm");
    assert.equal(calls, 1);
    const fallback = await generateAiAssist({ context: businessContext, action, entity: lead }, { ...deps, configured: () => false });
    assert.equal(fallback.source, "template");
    assert.equal(calls, 1);
    assert.equal(fallback.output, generateFromBusinessContext(businessContext, action, lead));
  }
});

test("llmChat without new options retains original models and provider failover", async (t) => {
  const calls = [];
  t.mock.method(console, "warn", () => {});
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push([url, JSON.parse(options.body).model]);
    return url.includes("anthropic") ? Response.json({ content: [{ type: "text", text: "Legacy answer" }] }) : failureResponse();
  });
  const result = await llmChat({ messages: [{ role: "user", content: "Legacy request" }], tier: "reasoning" });
  assert.deepEqual(calls, [
    ["https://ai-gateway.vercel.sh/v1/chat/completions", "openai/gpt-5.6-sol"],
    ["https://ai-gateway.vercel.sh/v1/chat/completions", "openai/gpt-5.4-mini"],
    ["https://api.anthropic.com/v1/messages", "claude-sonnet-4-20250514"],
  ]);
  assert.equal(result.text, "Legacy answer");
  assert.equal(result.provider, "anthropic");
  assert.equal(typeof result.latencyMs, "number");
});
