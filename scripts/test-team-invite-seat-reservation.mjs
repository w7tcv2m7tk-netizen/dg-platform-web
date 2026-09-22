import fs from "node:fs";
import assert from "node:assert/strict";
const source=fs.readFileSync("packages/platform-core/src/org/team-invites.ts","utf8");
const fn=source.slice(source.indexOf("export async function activateTeamInviteSeat"),source.indexOf("/** Store a pending seat"));
assert.match(fn,/if \(pending\)/,"pending invite must be activated");
assert.match(fn,/return null;/,"unreserved invite metadata must fail closed");
assert.doesNotMatch(fn,/const created = await prisma\.membership\.create/,"claim path must not mint an unreserved membership");
console.log("team invite seat reservation: ok");
