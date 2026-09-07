import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/apps/ai-communications/call-centre/page.tsx",
  "utf8",
);

test("Call Centre SSR requires explicit read authority before querying sessions", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("comms\.call_centre\.read"\)/);
  assert.match(page, /if \(!session\) notFound\(\)/);
  assert.doesNotMatch(page, /getPlatformPageContext/);
});

test("Call Centre reads stay scoped to the authorised organisation", () => {
  assert.match(page, /listCommunicationAgents\(session\.organisationId\)/);
  assert.match(page, /organisationId: session\.organisationId/);
});
