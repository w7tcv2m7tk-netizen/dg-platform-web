import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync("src/app/api/v1/referrals/route.ts", "utf8");
const platformApi = fs.readFileSync("src/lib/platform-api.ts", "utf8");

function handler(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = source.indexOf("export async function", start + 10);
  return next >= 0 ? source.slice(start, next) : source.slice(start);
}

test("referral admin helper uses canonical organisation admin predicate", () => {
  assert.match(route, /function requireReferralAdmin[\s\S]*sessionIsOrgAdmin\(session\)/);
  assert.match(platformApi, /function sessionIsOrgAdmin[\s\S]*startsWith\("api_key:"\)[\s\S]*return false/);
  assert.match(platformApi, /function sessionIsOrgAdmin[\s\S]*module:\s*"team"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/);
});

test("GET Connect sync requires referral admin but normal dashboard read does not", () => {
  const get = handler(route, "GET");
  const sync = get.indexOf('url.searchParams.get("syncConnect") === "1"');
  const gate = get.indexOf("requireReferralAdmin(session)", sync);
  const mutation = get.indexOf("syncStripeConnectAccount", sync);
  assert.ok(sync >= 0 && gate > sync && mutation > gate);
  const dashboard = get.indexOf("getReferAndEarnDashboard");
  assert.ok(dashboard > mutation);
});

test("Connect onboarding authorises before creating onboarding link", () => {
  const post = handler(route, "POST");
  const branch = post.indexOf('body.action === "connect_onboarding"');
  const gate = post.indexOf("requireReferralAdmin(session)", branch);
  const mutation = post.indexOf("createStripeConnectOnboardingLink", branch);
  assert.ok(branch >= 0 && gate > branch && mutation > gate);
});

test("Connect sync authorises before syncing account", () => {
  const post = handler(route, "POST");
  const branch = post.indexOf('body.action === "connect_sync"');
  const gate = post.indexOf("requireReferralAdmin(session)", branch);
  const mutation = post.indexOf("syncStripeConnectAccount", branch);
  assert.ok(branch >= 0 && gate > branch && mutation > gate);
});

test("referral tier mutation authorises before programme update", () => {
  const post = handler(route, "POST");
  const branch = post.indexOf('body.action === "set_referral_tier"');
  const gate = post.indexOf("requireReferralAdmin(session)", branch);
  const mutation = post.indexOf("updateOrganisationReferralProgramme", branch);
  assert.ok(branch >= 0 && gate > branch && mutation > gate);
});

test("cash payout authority and ordinary referral invite remain intact", () => {
  const post = handler(route, "POST");
  const payout = post.indexOf('body.action === "cash_payout"');
  assert.ok(payout >= 0);
  assert.ok(post.indexOf("sessionIsOrgAdmin(session)", payout) > payout);
  const invite = post.indexOf("createReferralInvite");
  assert.ok(invite >= 0);
  assert.ok(post.lastIndexOf("requireReferralAdmin(session)", invite) < invite);
});
