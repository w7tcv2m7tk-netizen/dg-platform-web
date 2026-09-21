import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTemplateActivationPatch,
  resolveIndustryEntitlements,
} from "../packages/platform-core/src/industry/entitlements.ts";
import { getIndustry } from "../packages/platform-core/src/industry/catalogue.ts";

const onboarding = readFileSync(
  new URL("../src/components/onboarding/VipIndustryProfileSetup.tsx", import.meta.url),
  "utf8",
);

function activeForIndustry(result, industryId) {
  return result.industries.find((item) => item.industryId === industryId)?.activeTemplateIds ?? [];
}

test("Services shared runtime app does not activate sibling sub-industry Apps", () => {
  const settings = buildTemplateActivationPatch(null, "electrical", true, "2026-09-21T00:00:00.000Z");
  const resolved = resolveIndustryEntitlements({
    enabledAppIds: ["services"],
    industrySettings: settings,
  });

  assert.deepEqual(activeForIndustry(resolved, "services"), ["electrical"]);
  assert.equal(resolved.activeTemplateIds.includes("plumbing"), false);
  assert.equal(resolved.activeTemplateIds.includes("cleaning"), false);
  assert.equal(resolved.activeTemplateIds.includes("maintenance"), false);
});

test("Property child activation remains exact and does not enable siblings", () => {
  const settings = buildTemplateActivationPatch(null, "property-management", true, "2026-09-21T00:00:00.000Z");
  const resolved = resolveIndustryEntitlements({
    enabledAppIds: ["property-management"],
    industrySettings: settings,
  });

  assert.deepEqual(activeForIndustry(resolved, "property"), ["property-management"]);
  assert.equal(resolved.activeTemplateIds.includes("real-estate"), false);
  assert.equal(resolved.activeTemplateIds.includes("commercial-property"), false);
});

test("canonical parent aliases resolve to the same Industry", () => {
  assert.equal(getIndustry("accommodation-hospitality")?.id, "hospitality-accommodation");
  assert.equal(getIndustry("hospitality-accommodation")?.id, "hospitality-accommodation");
});

test("onboarding filters by canonical parent Industry and replaces siblings by parent", () => {
  assert.match(onboarding, /getIndustry\(group\.id\)/);
  assert.match(onboarding, /getIndustry\(id\)/);
  assert.match(onboarding, /select\(sub\.id, group\.id\)/);
  assert.match(onboarding, /INDUSTRY_TAXONOMY\.find\(\(item\) => item\.id === industryId\)/);
  assert.doesNotMatch(onboarding, /select\(sub\.id, sub\.appId\)/);
});
