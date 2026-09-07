import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const teamRoute = fs.readFileSync("src/app/api/v1/org/team/route.ts", "utf8");

test("team profile updates remain native and do not automatically publish to WordPress", () => {
  assert.match(teamRoute, /updateMembershipProfile\(session\.organisationId, membershipId/);
  assert.match(teamRoute, /pushMembershipProfileToClerk/);
  assert.match(teamRoute, /const websiteSync = null/);
  assert.doesNotMatch(teamRoute, /publishMembershipToWordPressAgent/);
  assert.doesNotMatch(teamRoute, /body\.syncToWebsite/);
});
