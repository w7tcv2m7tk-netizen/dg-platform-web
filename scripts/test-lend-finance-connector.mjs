import fs from "node:fs";
import assert from "node:assert/strict";

const types = fs.readFileSync("packages/platform-core/src/connectors/framework/types.ts", "utf8");
const client = fs.readFileSync("packages/platform-core/src/connectors/lend/client.ts", "utf8");
const finance = fs.readFileSync("packages/platform-core/src/finance/templates.ts", "utf8");

assert.match(types, /id:"lend"/);
assert.match(types, /appIds:\["finance"\]/);
assert.match(types, /industryTemplateIds:\["mortgage_broking"\]/);
assert.match(types, /maturity:"planned"/);
assert.match(types, /category:"finance"/);
assert.match(finance, /key: "mortgage_broking"/);
assert.match(client, /Environment/);
assert.match(client, /"sandbox"/);
assert.match(client, /Version/);
assert.match(client, /20190501/);
assert.match(client, /Authorization/);
assert.match(client, /\/api\/configs\/purposes/);
assert.match(client, /\/api\/leads/);

console.log("Lend finance connector foundation contract passed");
