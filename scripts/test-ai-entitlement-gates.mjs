import fs from "node:fs";
import assert from "node:assert/strict";
const routes=[
 ["Aida advisor","src/app/api/v1/ai/advisor/route.ts"],
 ["AI assist","src/app/api/v1/ai/assist/route.ts"],
 ["Aida tool execution","src/app/api/v1/ai/tools/execute/route.ts"],
 ["AI Visibility observation","src/app/api/v1/ai-visibility/monitoring/run/route.ts"],
 ["Website AI component","src/app/api/v1/websites/[id]/ai-component/route.ts"],
 ["Website AI markup","src/app/api/v1/websites/[id]/ai-markup/route.ts"],
];
for(const [name,path] of routes){const s=fs.readFileSync(path,"utf8");assert.match(s,/assertEntitlement\(session\.organisationId, "useAi"\)/,name+" must honour AI entitlement");}
console.log("AI entitlement gates: ok");
