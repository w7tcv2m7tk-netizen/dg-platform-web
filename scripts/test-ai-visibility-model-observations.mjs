import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const observer = read("packages/platform-core/src/ai-visibility/model-observer.ts");
const route = read("src/app/api/v1/ai-visibility/monitoring/run/route.ts");
const runner = read("src/components/ai-visibility/AiVisibilityMonitorRunner.tsx");
const section = read("src/app/(shell)/apps/ai-visibility/[section]/page.tsx");

test("model observations use a real configured LLM response and persist exact provenance", () => {
  assert.match(observer, /await llmChat\(/);
  assert.match(observer, /provider: result\.provider/);
  assert.match(observer, /model: result\.model/);
  assert.match(observer, /engineModel: result\.model/);
  assert.match(observer, /answerContext: result\.text/);
  assert.match(observer, /sourceRef = `model-api:/);
});

test("model observer does not invent citations, ranks or recommendation capture", () => {
  assert.match(observer, /citationCaptureComplete: false/);
  assert.match(observer, /answerRank: null/);
  assert.match(observer, /recommendationCaptureComplete: false/);
  assert.match(observer, /citations: \[\]/);
  assert.doesNotMatch(observer, /citedOwnDomain: true/);
});

test("run API is organisation scoped and records nothing when model transport is unavailable", () => {
  assert.match(route, /requirePlatformAuth\(req\)/);
  assert.match(route, /module: "growth"/);
  assert.match(route, /action: "edit"/);
  assert.match(route, /organisationId: session\.organisationId/);
  assert.match(route, /error instanceof LlmChatError/);
  assert.match(route, /No observation was recorded/);
});

test("customer UI labels API evidence truthfully and gives recovery actions", () => {
  assert.match(runner, /Run a real AI model observation/);
  assert.match(runner, /model-API evidence/);
  assert.match(runner, /not a claim about the consumer ChatGPT, Gemini, Copilot or Perplexity interfaces/);
  assert.match(runner, /Try again/);
  assert.match(runner, /Ask Aida for help/);
  assert.match(section, /API-model observations/);
  assert.match(section, /Consumer answer-engine interface rankings/);
});
