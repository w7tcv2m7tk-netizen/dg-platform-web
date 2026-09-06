import fs from "node:fs";
import assert from "node:assert/strict";

const path = "src/app/(shell)/apps/ai-communications/inbox/page.tsx";
const source = fs.readFileSync(path, "utf8");

assert.match(source, /getAuthorisedPlatformPageSession/,
  "AI Communications inbox must use the authorised SSR session helper");
assert.ok(source.includes('"comms.call_centre.read"'),
  "AI Communications inbox must require comms.call_centre.read");
assert.doesNotMatch(source, /getPlatformPageContext/,
  "AI Communications inbox must not fall back to generic signed-in page context");

for (const query of [
  "getCommunicationsOverview(session.organisationId)",
  "listCommunicationSessions({ organisationId: session.organisationId, limit: 8 })",
  "listCommunicationAgents(session.organisationId)",
]) {
  assert.ok(source.includes(query), `authorised session must scope data query: ${query}`);
}

console.log("AI Communications inbox SSR authority assertions passed");
