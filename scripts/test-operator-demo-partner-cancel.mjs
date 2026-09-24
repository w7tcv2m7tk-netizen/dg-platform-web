import fs from "node:fs";
import assert from "node:assert/strict";

const demoSeed = fs.readFileSync("packages/platform-core/src/demo/seed.ts","utf8");
const memberships = fs.readFileSync("packages/platform-core/src/org/memberships.ts","utf8");
const invitations = fs.readFileSync("packages/platform-core/src/partners/invitations.ts","utf8");
const route = fs.readFileSync("src/app/api/v1/admin/partners/[id]/withdraw/route.ts","utf8");
const table = fs.readFileSync("src/components/partners/PartnerProgrammeDashboard.tsx","utf8");
const cancelButton = fs.readFileSync("src/components/partner/PartnerInvitationCancelButton.tsx","utf8");
const detail = fs.readFileSync("src/components/partner/PartnerAdminActions.tsx","utf8");
const workspace = fs.readFileSync("packages/platform-core/src/partners/dashboard-workspace.ts","utf8");

assert.match(demoSeed, /access: "customer" \| "partner" \| "staff"/);
assert.match(demoSeed, /input\.access === "staff" \? "dg:staff"/);
assert.match(memberships, /grantDemoAccess\(\{ clerkUserId, access: "staff" \}\)/);
assert.match(memberships, /isPlatformOperatorOrganisationId/);

assert.match(invitations, /withdrawPartnerInvitation/);
assert.match(invitations, /Only pending partner invitations can be cancelled/);
assert.match(route, /withdrawPartnerInvitation/);
assert.match(table, /PartnerInvitationCancelButton/);
assert.match(cancelButton, /Cancel invitation/);
assert.match(detail, /action\("withdraw"\)/);
assert.match(workspace, /p\.status !== "inactive"/);

console.log("operator demo access and partner invitation cancellation checks passed");
