import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) => fs.readFileSync(path, "utf8");

const cases = [
  ["src/app/(shell)/apps/ai-communications/inbox/page.tsx", "comms.call_centre.read"],
  ["src/app/(shell)/apps/ai-communications/call-centre/page.tsx", "comms.call_centre.read"],
  ["src/app/(shell)/apps/ai-communications/call-centre/[id]/page.tsx", "comms.call_centre.read"],
  ["src/app/(shell)/apps/ai-communications/voice/page.tsx", "comms.agents.read"],
  ["src/app/(shell)/apps/ai-communications/agents/page.tsx", "comms.agents.write"],
  ["src/app/(shell)/apps/ai-communications/knowledge/page.tsx", "comms.knowledge.read"],
  ["src/app/(shell)/apps/ai-communications/settings/page.tsx", "comms.settings.read"],
];

for (const [path, feature] of cases) {
  const source = read(path);
  assert.match(source, /getAuthorisedPlatformPageSession/,
    `${path} must use the authorised SSR session helper`);
  assert.ok(source.includes(`"${feature}"`), `${path} must require ${feature}`);
  assert.doesNotMatch(source, /getPlatformPageContext/,
    `${path} must not fall back to generic signed-in page context`);
}

const detail = read("src/app/(shell)/apps/ai-communications/call-centre/[id]/page.tsx");
assert.ok(detail.includes('sessionHasFeature(session, "comms.voice.recording")'),
  "call detail must preserve the stronger recording/transcript permission");

console.log("AI Communications SSR authority assertions passed");
