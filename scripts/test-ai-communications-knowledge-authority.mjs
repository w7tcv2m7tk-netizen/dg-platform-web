import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile("src/app/(shell)/apps/ai-communications/knowledge/page.tsx", "utf8");

assert.match(page, /getAuthorisedPlatformPageSession\("comms\.knowledge\.read"\)/);
assert.match(page, /if \(!session\) notFound\(\)/);
assert.doesNotMatch(page, /getPlatformPageContext/);

const authIndex = page.indexOf('getAuthorisedPlatformPageSession("comms.knowledge.read")');
const denyIndex = page.indexOf("if (!session) notFound()");
const readIndex = page.indexOf("getOrganisationBusinessProfile(session.organisationId)");
assert.ok(authIndex >= 0 && denyIndex > authIndex, "knowledge page must deny a missing session after authority resolution");
assert.ok(denyIndex >= 0 && readIndex > denyIndex, "knowledge authority must be established and enforced before profile read");

console.log("AI Communications knowledge authority regression checks passed.");
