import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, test } from "node:test";
import { llmChat } from "../packages/platform-core/src/ai/llm.ts";
import { runPublicAidaTurn } from "../packages/platform-core/src/aida/public-turns.ts";

const names = ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN", "OPENAI_API_KEY", "OPENAI_MODEL", "ANTHROPIC_API_KEY", "DG_LLM_PROVIDER"];
let saved;
beforeEach(() => {
  saved = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  names.forEach((name) => delete process.env[name]);
  process.env.AI_GATEWAY_API_KEY = "synthetic-gateway";
  process.env.OPENAI_API_KEY = "synthetic-openai";
});
afterEach(() => names.forEach((name) => saved[name] === undefined ? delete process.env[name] : process.env[name] = saved[name]));

const messages = [{ role: "user", content: "Public status question" }];

function abortedFetch() {
  return new Promise((resolve, reject) => {
    const signal = arguments[1]?.signal;
    if (!signal) return reject(new Error("missing signal"));
    if (signal.aborted) return reject(new Error("aborted"));
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  });
}

test("one provider timeout fails over to the next provider", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", (url, options) => {
    calls += 1;
    if (calls === 1) return abortedFetch(url, options);
    return Response.json({ choices: [{ message: { content: "fallback worked" } }], usage: { prompt_tokens: 3, completion_tokens: 2 } });
  });
  const result = await llmChat({ messages, deadlineMs: 1_000, attemptTimeoutMs: 25, safeErrors: true });
  assert.equal(result.text, "fallback worked");
  assert.equal(result.provider, "openai");
  assert.equal(calls, 2);
  assert.equal(result.attempts?.[0]?.ok, false);
  assert.equal(result.attempts?.[0]?.error, "timeout");
});

test("all providers timing out fails with a retryable timeout classification", async (t) => {
  let calls = 0;
  t.mock.method(globalThis, "fetch", (url, options) => { calls += 1; return abortedFetch(url, options); });
  await assert.rejects(
    llmChat({ messages, deadlineMs: 120, attemptTimeoutMs: 25, safeErrors: true }),
    (error) => error.code === "timeout" && error.retryable === true && error.attempts.length === 2,
  );
  assert.equal(calls, 2);
});

test("external cancellation is classified as aborted and non-retryable", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    llmChat({ messages, signal: controller.signal, deadlineMs: 1_000, attemptTimeoutMs: 25, safeErrors: true }),
    (error) => error.code === "aborted" && error.retryable === false,
  );
});

test("missing providers fail closed without a retryable transport error", async () => {
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(
    llmChat({ messages, safeErrors: true }),
    (error) => error.code === "no_provider" && error.retryable === false,
  );
});

test("safe failure classification does not expose provider bodies", async (t) => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("PRIVATE_PROVIDER_BODY"); });
  await assert.rejects(
    llmChat({ messages, deadlineMs: 1_000, attemptTimeoutMs: 100, safeErrors: true }),
    (error) => error.code === "transport_failed" && !error.message.includes("PRIVATE_PROVIDER_BODY") &&
      error.attempts.every((attempt) => !attempt.error?.includes("PRIVATE_PROVIDER_BODY")),
  );
});

test("public Aida uses bounded deadlines and still returns a visible fallback", async () => {
  let call;
  const turn = await runPublicAidaTurn(
    { userText: "What is DigitalGate?", history: [], docs: [] },
    {
      llmConfigured: () => true,
      llmChat: async (input) => { call = input; throw new Error("synthetic provider failure"); },
    },
  );
  assert.equal(call.deadlineMs, 12_000);
  assert.equal(call.attemptTimeoutMs, 6_000);
  assert.equal(call.safeErrors, true);
  assert.equal(turn.source, "llm_error");
  assert.match(turn.reply, /Try again|snag/i);
});

test("Aida and support clients have timeout, catch and non-duplicating retry paths", () => {
  const aida = readFileSync("src/components/websites/AskAidaWidget.tsx", "utf8");
  const support = readFileSync("src/components/support/SupportChatPanel.tsx", "utf8");
  const supportCore = readFileSync("packages/platform-core/src/support/ai-reply.ts", "utf8");
  const llm = readFileSync("packages/platform-core/src/ai/llm.ts", "utf8");
  assert.match(aida, /AbortController/);
  assert.match(aida, /25_000/);
  assert.match(aida, /catch \{/);
  assert.match(aida, /await bootstrap\(\)/);
  assert.doesNotMatch(aida, /await send\(lastPrompt\.text/);
  assert.match(support, /AbortSignal\.timeout\(15_000\)/);
  assert.match(support, /took too long to respond/);
  assert.match(support, /error && messages\.length > 0/);
  assert.match(supportCore, /SUPPORT_AI_UNAVAILABLE_REPLY/);
  assert.match(supportCore, /appendSupportAiReply/);
  assert.match(supportCore, /safeErrors: true/);
  assert.doesNotMatch(llm, /DEFAULT_ATTEMPT_TIMEOUT_MS/);
  assert.match(llm, /attemptTimeoutMs === undefined/);
});
