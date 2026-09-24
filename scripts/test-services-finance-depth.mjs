import fs from "node:fs";
import assert from "node:assert/strict";

const services = fs.readFileSync("src/app/(shell)/apps/services/page.tsx", "utf8");
const finance = fs.readFileSync("src/app/(shell)/apps/finance/page.tsx", "utf8");

assert.match(services, /Today in Services/);
assert.match(services, /Keep work moving from customer to schedule to completion/);
assert.match(services, /Review \{overview\.counts\.unassignedOpen\} unassigned/);
assert.match(services, /Open schedule/);
assert.match(services, /commercial records stay in Commerce/);

assert.match(finance, /Finance workspace/);
assert.match(finance, /Move applications with the customer context attached/);
assert.match(finance, /Active pipeline value/);
assert.match(finance, /Records needing context/);
assert.match(finance, /needsBorrower/);
assert.match(finance, /needsLender/);
assert.match(finance, /needsAmount/);
assert.match(finance, /Open pipeline/);
assert.match(finance, /View CRM clients/);

console.log("services and finance depth checks passed");
