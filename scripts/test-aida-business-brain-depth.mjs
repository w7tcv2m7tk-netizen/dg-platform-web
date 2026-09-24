import fs from "node:fs";
import assert from "node:assert/strict";

const ask=fs.readFileSync("packages/platform-core/src/advisor/ask-advisor.ts","utf8");
const boundary=fs.readFileSync("packages/platform-core/src/advisor/ask-advisor-with-knowledge.ts","utf8");
const pageData=fs.readFileSync("src/lib/advisor-page-data.ts","utf8");
const route=fs.readFileSync("src/app/api/v1/ai/advisor/route.ts","utf8");
const ui=fs.readFileSync("src/components/intelligence/AiAdvisorDashboard.tsx","utf8");

assert.match(ask,/Authoritative current business evidence:[\s\S]*authoritativeEvidence/);
assert.match(ask,/use only when supported by the authoritative evidence and approved organisational context/);
assert.match(boundary,/getApprovedKnowledgeContext/);
assert.match(boundary,/organisationId: input\.organisationId/);
assert.match(pageData,/getApprovedKnowledgeContext/);
assert.match(pageData,/hasApprovedKnowledge: approvedKnowledge\.items\.length > 0/);
assert.match(route,/getApprovedKnowledgeContext/);
assert.match(route,/hasApprovedKnowledge: approvedKnowledge\.items\.length > 0/);
assert.match(ui,/Grounded in Business Brain, approved knowledge and current available evidence/);
assert.doesNotMatch(ui,/\? "Live AI response"/);

console.log("Aida and Business Brain depth checks passed");
