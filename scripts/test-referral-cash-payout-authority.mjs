import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/referrals/route.ts", "utf8");
const platformApi = fs.readFileSync("src/lib/platform-api.ts", "utf8");

const cashBranch = route.slice(
  route.indexOf('if (body.action === "cash_payout"'),
  route.indexOf('if (body.action === "connect_onboarding"'),
);

const orgAdminPredicate = platformApi.slice(
  platformApi.indexOf("export function sessionIsOrgAdmin"),
  platformApi.indexOf("export function requireOrgAdmin"),
);

test("cash payout requires organisation-admin authority before payout execution", () => {
  assert.match(cashBranch, /sessionIsOrgAdmin\(session\)/);
  assert.match(cashBranch, /status: 403/);
  assert.ok(
    cashBranch.indexOf("sessionIsOrgAdmin(session)") < cashBranch.indexOf("requestCashPayout("),
    "authority must be checked before requestCashPayout",
  );
});

test("organisation API-key principals cannot qualify as org admins", () => {
  assert.match(orgAdminPredicate, /clerkUserId\.startsWith\("api_key:"\)/);
  assert.match(orgAdminPredicate, /return false/);
});

test("owner/admin and explicit organisation team-manage grants retain admin authority", () => {
  assert.match(orgAdminPredicate, /\["owner", "admin"\]\.includes\(session\.role\)/);
  assert.match(orgAdminPredicate, /module: "team"/);
  assert.match(orgAdminPredicate, /action: "manage"/);
  assert.match(orgAdminPredicate, /scope: "organisation"/);
});

test("referral invite sharing remains outside the payout-only admin gate", () => {
  assert.ok(route.indexOf("createReferralInvite(") > route.indexOf('if (body.action === "cash_payout"'));
  const inviteTail = route.slice(route.indexOf("const email ="));
  assert.doesNotMatch(inviteTail, /sessionIsOrgAdmin\(session\)/);
});
