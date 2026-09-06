import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync("src/app/(shell)/apps/ai-communications/agents/page.tsx", "utf8");

test("Agent Builder requires explicit configure authority before agent reads or builder render", () => {
  assert.match(page, /getAuthorisedPlatformPageSession\("comms\.agents\.configure"\)/);
  assert.match(page, /if \(!session\) notFound\(\)/);
  assert.doesNotMatch(page, /getPlatformPageContext/);
  assert.match(page, /getCommunicationAgent\(session\.organisationId, id\)/);
});
