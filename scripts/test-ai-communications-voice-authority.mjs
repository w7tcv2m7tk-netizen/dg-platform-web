import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/apps/ai-communications/voice/page.tsx",
  "utf8",
);

test("Voice Agents SSR requires explicit voice read authority", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("comms\.voice\.read"\)/);
  assert.match(page, /if \(!session\) notFound\(\)/);
  assert.doesNotMatch(page, /getPlatformPageContext/);
});

test("Voice Agents reads remain tenant scoped", () => {
  assert.match(page, /listCommunicationAgents\(session\.organisationId\)/);
});
