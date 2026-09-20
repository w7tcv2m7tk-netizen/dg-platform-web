import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const capture = readFileSync("packages/platform-core/src/twin/capture-snapshot.ts", "utf8");
const context = readFileSync("packages/platform-core/src/org/business-context.ts", "utf8");
const evidence = readFileSync("packages/platform-core/src/ai/evidence-context.ts", "utf8");

test("Digital Twin never aliases revenue MTD to MRR", () => {
  assert.doesNotMatch(capture, /mrrCents:\s*metrics\.activeSubscriptions[^\n]*revenueMtdCents/);
  assert.match(capture, /mrrCents:\s*undefined/);
});

test("review evidence survives Twin to BusinessContext to Aida", () => {
  assert.match(capture, /reputationReviewCount:\s*metrics\.reputationReviewCount/);
  assert.match(context, /reputationReviewCount:\s*snapshot\.metrics\.reputationReviewCount/);
  assert.match(evidence, /reputation\.review_count/);
  assert.match(evidence, /reputation\.score/);
});

test("MRR remains explicit unavailable evidence until subscription authority is projected", () => {
  assert.match(context, /mrrCents:\s*snapshot\.metrics\.mrrCents/);
  assert.match(evidence, /commercial\.mrr/);
});
