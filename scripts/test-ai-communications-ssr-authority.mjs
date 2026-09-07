import fs from "node:fs";
import assert from "node:assert/strict";

const path = "src/app/(shell)/apps/ai-communications/inbox/page.tsx";
const source = fs.readFileSync(path, "utf8");

assert.match(source, /getAuthorisedPlatformPageSession/,
  "AI Communications inbox must use the authorised SSR session helper");
assert.ok(source.includes('"comms.inbox.read"'),
  "AI Communications inbox must require the manifest inbox authority");
assert.doesNotMatch(source, /getPlatformPageContext/,
  "AI Communications inbox must not fall back to generic signed-in page context");

for (const feature of [
  "comms.call_centre.read",
  "comms.voice.read",
  "comms.agents.configure",
  "comms.analytics.read",
  "comms.billing.read",
]) {
  assert.ok(source.includes(`"${feature}"`), `inbox must preserve scoped authority: ${feature}`);
}

assert.match(
  source,
  /canViewAnalytics \? getCommunicationsOverview\(session\.organisationId\) : Promise\.resolve\(null\)/,
  "overview query must require analytics authority",
);
assert.match(
  source,
  /canViewCallCentre[\s\S]*listCommunicationSessions\(\{ organisationId: session\.organisationId, limit: 8 \}\)/,
  "recent sessions query must require call-centre authority",
);
assert.match(
  source,
  /canViewVoice \? listCommunicationAgents\(session\.organisationId\) : Promise\.resolve\(null\)/,
  "agent query must require voice read authority",
);
assert.match(
  source,
  /canViewBilling[\s\S]*"Est\. cost"/,
  "estimated cost must require billing authority",
);
assert.match(
  source,
  /canConfigureAgents[\s\S]*Agent builder →/,
  "Agent Builder navigation must require agent configuration authority",
);

console.log("AI Communications inbox SSR authority assertions passed");
