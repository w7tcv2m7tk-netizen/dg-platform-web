import fs from "node:fs";
import assert from "node:assert/strict";

const routes = [
  ["communications send", "src/app/api/v1/communications/messages/route.ts"],
  ["invoice send", "src/app/api/v1/commerce/invoices/[id]/send/route.ts"],
  ["quote send", "src/app/api/v1/commerce/quotes/[id]/send/route.ts"],
  ["communications agent publish", "src/app/api/v1/communications/agents/[id]/publish/route.ts"],
];
for (const [name,path] of routes) {
  const source=fs.readFileSync(path,"utf8");
  assert.match(source,/assertEntitlement\(session\.organisationId, "outbound"\)/,name+" must honour outbound entitlement");
}
console.log("outbound entitlement gates: ok");
