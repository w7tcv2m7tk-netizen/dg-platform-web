import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { llmChat, llmConfigured, llmConfiguredForPublicData, resolveLlmTransports } from "../packages/platform-core/src/ai/llm.ts";
import { runPublicAidaTurn } from "../packages/platform-core/src/aida/public-turns.ts";
import { describeAiDeployments, validateDisclosurePolicy } from "../packages/platform-core/src/ai/policy.ts";

const names = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "OPENAI_API_KEY", "OPENAI_MODEL", "ANTHROPIC_API_KEY", "DG_LLM_PROVIDER", "DEEPSEEK_API_KEY", "DEEPSEEK_MODEL", "DEEPSEEK_BASE_URL"];
let saved;
beforeEach(() => {
  saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  names.forEach((name) => delete process.env[name]);
  process.env.DEEPSEEK_API_KEY = "synthetic-deepseek";
});
afterEach(() => names.forEach((name) => saved[name] === undefined ? delete process.env[name] : process.env[name] = saved[name]));

const messages = [{ role: "user", content: "What is DigitalGate?" }];

test("DeepSeek is public-data-only and absent from the default internal chain", () => {
  assert.equal(llmConfigured(), false);
  assert.equal(llmConfiguredForPublicData(), true);
  assert.equal(resolveLlmTransports("standard").some((transport) => transport.provider === "deepseek"), false);
  assert.equal(resolveLlmTransports("standard", true).some((transport) => transport.provider === "deepseek"), true);
});

test("explicit public-data-only call can use the OpenAI-compatible DeepSeek transport", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls += 1;
    assert.equal(String(url), "https://api.deepseek.com/chat/completions");
    assert.equal(options.headers.Authorization, "Bearer synthetic-deepseek");
    const body = JSON.parse(options.body);
    assert.equal(body.model, "deepseek-chat");
    assert.equal(body.max_tokens, 50);
    return Response.json({ choices: [{ message: { content: "Public answer" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } });
  });
  const result = await llmChat({ messages, maxTokens: 50, publicDataOnly: true, allowedProviders: ["deepseek"], safeErrors: true });
  assert.equal(result.text, "Public answer");
  assert.equal(result.provider, "deepseek");
  assert.equal(result.model, "deepseek-chat");
  assert.deepEqual(result.usage, { tokensIn: 3, tokensOut: 2 });
  assert.equal(calls, 1);
});

test("internal callers cannot opt into DeepSeek by name alone", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => { calls += 1; return Response.json({ choices: [{ message: { content: "must not run" } }] }); });
  await assert.rejects(
    llmChat({ messages, allowedProviders: ["deepseek"], safeErrors: true }),
    /No LLM configured/,
  );
  assert.equal(calls, 0);
});

test("public Aida explicitly requests the public-only provider scope", async () => {
  let call;
  await runPublicAidaTurn(
    { userText: "What is DigitalGate?", history: [], docs: [] },
    { llmConfigured: () => true, llmChat: async (input) => { call = input; return { text: "Public Aida answer", provider: "deepseek", model: "deepseek-chat", latencyMs: 1 }; } },
  );
  assert.equal(call.publicDataOnly, true);
  assert.equal(call.allowedProviders, undefined);
});

test("gateway policy cannot certify or approve a DeepSeek recipient", () => {
  assert.deepEqual(describeAiDeployments([{ provider: "deepseek", model: "deepseek-chat" }]), []);
  assert.throws(() => validateDisclosurePolicy({
    version: 1,
    classification: "public",
    cloudPermitted: true,
    approvedRecipients: [{ transport: "deepseek", upstream: "openai", model: "deepseek-chat" }],
    localRequired: false,
    cloudFallbackPermitted: false,
  }));
});

test("invalid or non-HTTPS DeepSeek configuration fails closed", () => {
  process.env.DEEPSEEK_BASE_URL = "http://api.deepseek.com";
  assert.equal(llmConfiguredForPublicData(), false);
  assert.equal(resolveLlmTransports("standard", true).some((transport) => transport.provider === "deepseek"), false);
});

test("missing DeepSeek key fails closed without a provider", async () => {
  delete process.env.DEEPSEEK_API_KEY;
  await assert.rejects(
    llmChat({ messages, publicDataOnly: true, allowedProviders: ["deepseek"], safeErrors: true }),
    /No LLM configured/,
  );
});
