import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/apps/ai-communications/settings/page.tsx",
  "utf8",
);

test("AI Communications settings require existing agent configuration authority", () => {
  assert.match(
    page,
    /getAuthorisedPlatformPageSession\("comms\.agents\.configure"\)/,
  );
  assert.doesNotMatch(page, /getPlatformPageContext\(/);
});

test("settings authority resolves before provider and tenant usage reads", () => {
  const authority = page.indexOf(
    'getAuthorisedPlatformPageSession("comms.agents.configure")',
  );
  const health = page.indexOf("communicationsHealthCheck(session.organisationId)");
  const voice = page.indexOf("getVoiceProviderStatus()");
  const overview = page.indexOf("getCommunicationsOverview(session.organisationId)");

  assert.ok(authority >= 0);
  assert.ok(health > authority);
  assert.ok(voice > authority);
  assert.ok(overview > authority);
});

test("settings continue to scope organisation reads to the authorised session", () => {
  assert.match(page, /communicationsHealthCheck\(session\.organisationId\)/);
  assert.match(page, /getCommunicationsOverview\(session\.organisationId\)/);
});
