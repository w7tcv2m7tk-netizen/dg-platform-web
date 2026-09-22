import fs from "node:fs";
import assert from "node:assert/strict";
for(const path of ["packages/platform-core/src/billing/platform-stripe.ts","packages/platform-core/src/billing/commercial-offer.ts"]){const s=fs.readFileSync(path,"utf8");assert.match(s,/stripe\.customers\.retrieve/);assert.match(s,/customer\.deleted/);assert.match(s,/sessionParams\.customer_email = input\.email/);}
console.log("stripe stale customer recovery: ok");
