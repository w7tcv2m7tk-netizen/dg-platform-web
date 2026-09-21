import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const onboarding = read("src/components/onboarding/VipIndustryProfileSetup.tsx");
const entitlements = read("packages/platform-core/src/industry/entitlements.ts");
const catalogue = read("packages/platform-core/src/industry/catalogue.ts");
const templatesRoute = read("src/app/api/v1/org/industry/templates/route.ts");

test("onboarding recognises canonical parent Industry ids and aliases", () => {
  assert.match(onboarding, /getIndustry\(group\.id\)/);
  assert.match(onboarding, /getIndustry\(id\)/);
  assert.match(onboarding, /canonicalIndustryId/);
  assert.match(catalogue, /raw === "accommodation-hospitality" \? "hospitality-accommodation" : raw/);
});

test("onboarding chooses one primary sub-industry per parent Industry", () => {
  assert.match(onboarding, /select\(sub\.id, group\.id\)/);
  assert.match(onboarding, /INDUSTRY_TAXONOMY\.find\(\(item\) => item\.id === industryId\)/);
  assert.match(onboarding, /group\?\.subIndustries\.map\(\(sub\) => sub\.id\)/);
  assert.doesNotMatch(onboarding, /select\(sub\.id, sub\.appId\)/);
});

test("shared runtime app ids cannot implicitly activate every sibling template", () => {
  assert.match(entitlements, /appIdOwnerCounts/);
  assert.match(entitlements, /const owners = appIdOwnerCounts\.get\(template\.appId\) \?\? 0/);
  assert.match(entitlements, /owners <= 1 \|\| template\.isDefaultIncluded/);
  assert.match(entitlements, /if \(entry\) \{\s*return entry\.active === true;\s*\}/);
});

test("Services runtime keys are mirrored from exact active child Apps", () => {
  assert.match(templatesRoute, /resolvedAfterPatch/);
  assert.match(templatesRoute, /activeTemplateIds\.map\(\(id\) => serviceTemplateKeyBySubindustry\[id\]\)/);
  assert.match(templatesRoute, /electrical:\s*"electrician"/);
  assert.match(templatesRoute, /plumbing:\s*"plumber"/);
  assert.match(templatesRoute, /cleaning:\s*"cleaner"/);
  assert.match(templatesRoute, /maintenance:\s*"maintenance"/);
});
