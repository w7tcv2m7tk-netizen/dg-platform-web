import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile("src/app/(shell)/apps/ai-communications/knowledge/page.tsx", "utf8");

assert.match(page, /getAuthorisedPlatformPageSession\("comms\.knowledge\.read"\)/);
assert.doesNotMatch(page, /getPlatformPageContext/);

const authIndex = page.indexOf('getAuthorisedPlatformPageSession("comms.knowledge.read")');
const readIndex = page.indexOf("getOrganisationBusinessProfile(session.organisationId)");
assert.ok(authIndex >= 0 && readIndex > authIndex, "knowledge authority must be established before profile read");

console.log("AI Communications knowledge authority regression checks passed.");
