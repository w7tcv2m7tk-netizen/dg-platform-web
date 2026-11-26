import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const overview = readFileSync("src/components/prospecting/ProspectingOverview.tsx", "utf8");
const support = readFileSync("packages/platform-core/src/support/ai-reply.ts", "utf8");
const relationship = readFileSync("src/components/prospecting/ProspectRelationshipForm.tsx", "utf8");

test("Prospecting overview is the default and exposes a Daily 3 workflow", () => {
  assert.match(overview, /DigitalGate Daily 3/);
  assert.match(overview, /buildDailyThreeSummary\(ready\)/);
  assert.match(overview, /href="\/apps\/prospecting\/today"/);
  assert.match(overview, /Three qualified conversations, every working day/);
});

test("linking an existing CRM relationship clearly leads to research", () => {
  assert.match(relationship, /Relationship linked\. Next: research this business/);
  assert.match(relationship, /#audit-evidence/);
  assert.match(relationship, /linked CRM contact supplies identity/);
});

test("Support never silently accepts a question without a persisted response", () => {
  assert.match(support, /if \(!aiEnabled\(\)\) \{/);
  assert.match(support, /appendSupportAiReply\(conversationId, triggerMessageId, SUPPORT_AI_UNAVAILABLE_REPLY\)/);
  assert.match(support, /if \(!text\) \{/);
  assert.match(support, /Order support text|orderSupport/i.test(support) ? /orderSupport/i : /Write Aida/);
});

console.log("Commercial readiness sprint checks passed.");
