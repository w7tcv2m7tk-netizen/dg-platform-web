import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDailyThreeSummary, dedupeByKey } from "../src/lib/prospecting-daily-three.ts";
import { llmChat } from "../packages/platform-core/src/ai/llm.ts";
import { runPublicAidaTurn } from "../packages/platform-core/src/aida/public-turns.ts";

test("Daily 3 prepared/remaining counts cover zero, partial and full states", () => {
  assert.deepEqual(buildDailyThreeSummary(0), { target: 3, prepared: 0, remaining: 3 });
  assert.deepEqual(buildDailyThreeSummary(1), { target: 3, prepared: 1, remaining: 2 });
  assert.deepEqual(buildDailyThreeSummary(4), { target: 3, prepared: 3, remaining: 0 });
  assert.deepEqual(buildDailyThreeSummary(-2), { target: 3, prepared: 0, remaining: 3 });
});

test("Daily 3 deduplicates prospect identities before slicing", () => {
  const rows = dedupeByKey([
    { prospectId: "a", name: "A" }, { prospectId: "a", name: "A duplicate" },
    { prospectId: "b", name: "B" }, { prospectId: null, name: "missing" },
    { prospectId: "c", name: "C" }, { prospectId: "d", name: "D" },
  ], (row) => row.prospectId);
  assert.deepEqual(rows.map((row) => row.prospectId), ["a", "b", "c", "d"]);
});

test("controlled Gateway mock returns a substantive successful response", async (t) => {
  const old = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic";
  t.mock.method(globalThis, "fetch", async () => Response.json({ choices: [{ message: { content: "You can invite a teammate from Settings → Team." } }], usage: { prompt_tokens: 8, completion_tokens: 9 } }));
  try {
    const result = await llmChat({ messages: [{ role: "user", content: "How do I invite a teammate?" }], deadlineMs: 1000, attemptTimeoutMs: 100, safeErrors: true });
    assert.match(result.text, /Settings/);
  } finally {
    if (old === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = old;
  }
});


test("controlled empty model output is treated as no useful reply", async (t) => {
  const old = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "synthetic";
  t.mock.method(globalThis, "fetch", async () => Response.json({ choices: [{ message: { content: "" } }], usage: { prompt_tokens: 2, completion_tokens: 0 } }));
  try {
    await assert.rejects(
      llmChat({ messages: [{ role: "user", content: "Hello" }], deadlineMs: 1000, attemptTimeoutMs: 100, safeErrors: true }),
      (error) => error.code === "transport_failed",
    );
  } finally {
    if (old === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = old;
  }
});

test("Aida public success path uses the injected model response", async () => {
  const turn = await runPublicAidaTurn({ userText: "What does DigitalGate do?", history: [], docs: [] }, {
    llmConfigured: () => true,
    llmChat: async () => ({ text: "DigitalGate is a business operating platform.", provider: "gateway", model: "openai/gpt-4o-mini" }),
  });
  assert.equal(turn.source, "llm");
  assert.match(turn.reply, /business operating platform/i);
});

test("Support fallback is persisted when AI is unavailable and escalation remains explicit", () => {
  const support = readFileSync("packages/platform-core/src/support/ai-reply.ts", "utf8");
  assert.match(support, /if \(!aiEnabled\(\)\) \{/);
  assert.match(support, /appendSupportAiReply\(conversationId, triggerMessageId, SUPPORT_AI_UNAVAILABLE_REPLY\)/);
  assert.match(support, /if \(!text\) \{/);
  assert.match(support, /If the client asks for a person, disputes money, reports an outage/);
  assert.match(support, /where: \{ id: conversation\.organisationId \}/);
  assert.match(support, /deadlineMs: 12_000/);
  assert.match(support, /attemptTimeoutMs: 6_000/);
});
