import assert from "node:assert/strict";
import fs from "node:fs";

const navigation = fs.readFileSync("packages/platform-core/src/apps/navigation.ts", "utf8");
const sidebar = fs.readFileSync("src/components/SidebarNav.tsx", "utf8");
const supportPage = fs.readFileSync("src/app/(shell)/support/page.tsx", "utf8");
const helpPage = fs.readFileSync("src/app/(shell)/support/help/page.tsx", "utf8");

assert.match(navigation, /label: "Support Centre"/);
assert.match(navigation, /operatorApp\("dg-support", "Support Centre"/);
assert.match(navigation, /path: "\/support\/tickets", label: "Conversations"/);

const orderBlock = sidebar.match(/const DIGITALGATE_OPERATOR_ORDER = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
assert.ok(orderBlock.indexOf('"dg-support"') > orderBlock.indexOf('"dg-platform-intelligence"'), "Support Centre must be last in the DigitalGate operator app order");
assert.match(sidebar, /"dg-support": "Support Centre"/);

assert.match(supportPage, />How can we help\?</);
assert.match(supportPage, />Ask Aida</);
assert.match(supportPage, />Browse help</);
assert.match(supportPage, />Contact support</);
assert.match(supportPage, />Your support conversation</);
assert.match(supportPage, /surfacePath="\/support"/);

assert.match(helpPage, /type="search"/);
assert.match(helpPage, /Search setup, billing, CRM, connections, apps/);
assert.match(helpPage, /No matching help articles/);

console.log("support centre UX checks passed");
