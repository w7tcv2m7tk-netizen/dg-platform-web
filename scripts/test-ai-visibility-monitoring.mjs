import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const monitoring = read("packages/platform-core/src/ai-visibility/monitoring.ts");
const route = read("src/app/api/v1/ai-visibility/monitoring/route.ts");
const visibility = read("packages/platform-core/src/ai-visibility/index.ts");
const currentSnapshot = read("packages/platform-core/src/ai-visibility/current-snapshot.ts");
const platformIndex = read("packages/platform-core/src/index.ts");

test("AI Visibility monitoring accepts only organisation-governed evidence", () => {
  assert.match(monitoring, /promptIds\.has\(observation\.promptId\)/);
  assert.match(monitoring, /competitorIds\.has\(mention\.competitorId\)/);
  assert.match(monitoring, /sourceRef for provenance/);
  assert.match(monitoring, /recordAiVisibilityObservation/);
});

test("monitoring completeness remains explicit rather than inferred", () => {
  assert.match(monitoring, /citationCaptureComplete: observation\.citationCaptureComplete/);
  assert.match(monitoring, /competitorCaptureComplete: observation\.competitorCaptureComplete/);
  assert.match(visibility, /citationCaptureComplete === true/);
  assert.match(visibility, /competitorCaptureComplete === true/);
});

test("monitoring API is authenticated, organisation-scoped and permission guarded", () => {
  assert.match(route, /requirePlatformAuth\(req\)/);
  assert.match(route, /module: "growth"/);
  assert.match(route, /scope: "organisation"/);
  assert.match(route, /session\.organisationId/);
  assert.doesNotMatch(route, /organisationId\s*:\s*body/);
});

test("monitoring control plane does not fabricate or invoke answer engines", () => {
  assert.doesNotMatch(monitoring, /api\.openai\.com|generativelanguage\.googleapis\.com|perplexity\.ai|llmChat\(/i);
  assert.match(monitoring, /missingEvidenceIsUnavailable: true/);
});

test("current AI Visibility scores use active prompts and only latest prompt-provider-model evidence", () => {
  assert.match(currentSnapshot, /status: "active"/);
  assert.match(currentSnapshot, /promptId: \{ in: promptIds \}/);
  assert.match(currentSnapshot, /const key = `\$\{row\.promptId\}::\$\{row\.engine\}::\$\{row\.engineModel \?\? ""\}`/);
  assert.match(currentSnapshot, /if \(seen\.has\(key\)\) return false/);
  assert.match(currentSnapshot, /latest_per_active_prompt_provider_model/);
  assert.match(currentSnapshot, /Latest persisted model observations/);
  assert.doesNotMatch(currentSnapshot, /answer-engine observations/i);
});

test("public AI Visibility snapshot consumers resolve to the current evidence implementation", () => {
  assert.match(platformIndex, /getCurrentAiVisibilityIntelligenceSnapshot as getAiVisibilityIntelligenceSnapshot/);
  assert.match(monitoring, /getCurrentAiVisibilityIntelligenceSnapshot/);
  assert.match(monitoring, /snapshot: await getCurrentAiVisibilityIntelligenceSnapshot/);
});
