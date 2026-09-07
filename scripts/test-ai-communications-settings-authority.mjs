import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/apps/ai-communications/settings/page.tsx",
  "utf8",
);

test("AI Communications settings require existing agent configuration authority", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("comms\.agents\.configure"\)/);
  assert.doesNotMatch(page, /getPlatformPageContext\(/);
});

test("settings authority resolves before provider reads", () => {
  const authority = page.indexOf(
    'getAuthorisedPlatformPageSession("comms.agents.configure")',
  );
  const health = page.indexOf("communicationsHealthCheck(session.organisationId)");
  const voice = page.indexOf("getVoiceProviderStatus()");

  assert.ok(authority >= 0);
  assert.ok(health > authority);
  assert.ok(voice > authority);
});

test("usage data requires billing read authority and remains tenant scoped", () => {
  assert.match(page, /sessionHasFeature\(session, "comms\.billing\.read"\)/);
  assert.match(
    page,
    /canViewBilling \? getCommunicationsOverview\(session\.organisationId\) : Promise\.resolve\(null\)/,
  );
  assert.match(page, /\{canViewBilling \? \(/);
  assert.match(page, /communicationsHealthCheck\(session\.organisationId\)/);
  assert.match(page, /getCommunicationsOverview\(session\.organisationId\)/);
});
