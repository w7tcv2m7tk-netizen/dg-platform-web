import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const apps = fs.readFileSync("src/app/api/v1/org/apps/route.ts", "utf8");
const goals = fs.readFileSync("src/app/api/v1/org/goals/route.ts", "utf8");
const brand = fs.readFileSync("src/app/api/v1/org/brand-asset/route.ts", "utf8");
const onboarding = fs.readFileSync("src/app/api/v1/onboarding/gen2/route.ts", "utf8");
const publicOnboarding = fs.readFileSync("src/app/api/onboarding/route.ts", "utf8");
const defaults = fs.readFileSync("packages/platform-core/src/access/defaults.ts", "utf8");

function handler(source, name) {
  const start = source.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = source.indexOf("export async function", start + 10);
  return next >= 0 ? source.slice(start, next) : source.slice(start);
}

test("all organisation app mutations require settings.manage", () => {
  assert.match(apps, /function requireAppSettingsManage[\s\S]*module:\s*"settings"[\s\S]*action:\s*"manage"[\s\S]*scope:\s*"organisation"/);
  const patch = handler(apps, "PATCH");
  for (const action of ["apply_plan", "toggle", "set", "reset"]) {
    const start = patch.indexOf(`body.action === "${action}"`);
    assert.ok(start >= 0, `${action} branch must exist`);
    const slice = patch.slice(start, start + 1200);
    assert.match(slice, /requireAppSettingsManage\(session\)/, `${action} must enforce app settings authority`);
  }
});

test("organisation goal writes require organisation-scope settings.edit", () => {
  assert.match(goals, /function requireOrganisationGoalWrite[\s\S]*module:\s*"settings"[\s\S]*action:\s*"edit"[\s\S]*scope:\s*"organisation"/);
  for (const name of ["POST", "PATCH", "DELETE"]) {
    const body = handler(goals, name);
    assert.match(body, /requireOrganisationGoalWrite\(session\)/);
    assert.ok(
      body.indexOf("requireOrganisationGoalWrite(session)") <
        body.search(/createOrganisationGoal|updateOrganisationGoal|deleteOrganisationGoal/),
      `${name} must authorise before goal mutation`,
    );
  }
  assert.doesNotMatch(handler(goals, "GET"), /requireOrganisationGoalWrite/);
});

test("organisation brand upload authorises before reading or storing the file", () => {
  const post = handler(brand, "POST");
  assert.match(post, /module:\s*"settings"/);
  assert.match(post, /action:\s*"edit"/);
  assert.match(post, /scope:\s*"organisation"/);
  const gate = post.indexOf('action: "edit"');
  assert.ok(gate >= 0);
  assert.ok(gate < post.indexOf("req.formData()"));
  assert.ok(gate < post.indexOf("storeOrgBrandAsset"));
});

test("Gen2 onboarding PATCH requires organisation-scope settings.edit before writes", () => {
  const patch = handler(onboarding, "PATCH");
  assert.match(patch, /module:\s*"settings"/);
  assert.match(patch, /action:\s*"edit"/);
  assert.match(patch, /scope:\s*"organisation"/);
  const gate = patch.indexOf('action: "edit"');
  assert.ok(gate >= 0);
  for (const mutation of [
    "updateOrganisationBusinessProfile",
    "createOrganisationGoal",
    "saveGen2OnboardingProgress",
  ]) {
    assert.ok(gate < patch.indexOf(mutation), `authority must precede ${mutation}`);
  }
});

test("Gen2 onboarding checkout retains billing.manage and public intent capture stays public", () => {
  const post = handler(onboarding, "POST");
  assert.match(post, /module:\s*"billing"/);
  assert.match(post, /action:\s*"manage"/);
  assert.match(post, /scope:\s*"organisation"/);
  assert.match(publicOnboarding, /submitOnboarding\(body\)/);
  assert.doesNotMatch(publicOnboarding, /requirePermission|requirePlatformAuth|requirePlatformSession/);
});

test("ordinary members do not receive organisation settings edit/manage by default", () => {
  const memberStart = defaults.indexOf("// Member");
  const memberEnd = defaults.indexOf("export function defaultGrantsForPlatformUserType");
  const memberBlock = defaults.slice(memberStart, memberEnd);
  assert.match(memberBlock, /\["settings"\], \["view"\], "own"/);
  assert.doesNotMatch(memberBlock, /\["settings"\][\s\S]*\["edit"\][\s\S]*"organisation"/);
  assert.doesNotMatch(memberBlock, /\["settings"\][\s\S]*\["manage"\][\s\S]*"organisation"/);
});
