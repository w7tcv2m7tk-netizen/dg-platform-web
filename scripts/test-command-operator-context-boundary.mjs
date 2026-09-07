/**
 * Issue #53 — operator-owned Command Centre pages must obtain a branded
 * PlatformOperatorContext and route every cross-tenant read through an operator
 * service wrapper (getOperator… / listOperator…), never a raw platform-core
 * service behind layout gating alone.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (p) => fs.readFileSync(p, "utf8");

const platformIntel = read("src/app/(shell)/command/platform-intelligence/[section]/page.tsx");
const diagnostics = read("src/app/(shell)/command/platform-health/diagnostics/page.tsx");
const followUps = read("src/app/(shell)/command/growth-engine/follow-ups/page.tsx");
const conversions = read("src/app/(shell)/command/growth-engine/conversions/page.tsx");
const docs = read("src/app/(shell)/command/docs/page.tsx");
const docSlug = read("src/app/(shell)/command/docs/[slug]/page.tsx");
const intelligence = read("src/app/(shell)/command/intelligence/page.tsx");
const productSection = read("src/app/(shell)/command/product/[section]/page.tsx");
const operatorServices = read("packages/platform-core/src/command-centre/operator-services.ts");
const opportunitiesSummaryApi = read("src/app/api/v1/command/opportunities/summary/route.ts");

test("Platform Intelligence uses branded operator context, not raw cross-tenant services", () => {
  assert.match(platformIntel, /requirePlatformOperatorContext\(\)/);
  assert.match(platformIntel, /getOperatorCommandCentreOpsHome\(operator\)/);
  assert.match(platformIntel, /getOperatorPlatformAlertsCentre\(operator\)/);
  // No raw platform-wide services, no login-only page context.
  assert.doesNotMatch(platformIntel, /getCommandCentreOpsHome\(\)/);
  assert.doesNotMatch(platformIntel, /getPlatformAlertsCentre\(\)/);
  assert.doesNotMatch(platformIntel, /getPlatformPageContext/);
});

test("Platform health diagnostics routes alerts through the operator wrapper", () => {
  assert.match(diagnostics, /requirePlatformOperatorContext\(\)/);
  assert.match(diagnostics, /getOperatorPlatformAlertsCentre\(operator\)/);
  assert.doesNotMatch(diagnostics, /getPlatformAlertsCentre\(\)/);
});

test("Growth follow-up aggregate uses the branded operator wrapper", () => {
  assert.match(followUps, /requirePlatformOperatorContext\(\)/);
  assert.match(followUps, /getOperatorGrowthFollowUpQueue\(operator/);
  assert.doesNotMatch(followUps, /[^r]getGrowthFollowUpQueue\(/);
});

test("Growth conversion aggregate uses the branded operator wrapper", () => {
  assert.match(conversions, /requirePlatformOperatorContext\(\)/);
  assert.match(conversions, /getOperatorGrowthConversionSnapshot\(operator/);
  assert.doesNotMatch(conversions, /[^r]getGrowthConversionSnapshot\(/);
});

test("Static operator docs/intelligence/product pages require operator context", () => {
  for (const [name, src] of [
    ["docs", docs],
    ["docs/[slug]", docSlug],
    ["intelligence", intelligence],
    ["product/[section]", productSection],
  ]) {
    assert.match(src, /requirePlatformOperatorContext\(\)/, `${name} must require operator context`);
    assert.doesNotMatch(src, /getPlatformPageContext/, `${name} must not rely on login-only context`);
  }
});

test("opportunities summary API uses branded operator guard + wrapper, not raw command-centre access", () => {
  assert.match(
    opportunitiesSummaryApi,
    /requirePlatformOperator\(req, "command\.opportunities\.read"\)/,
  );
  assert.match(opportunitiesSummaryApi, /listOperatorPlatformOpportunities\(auth\.operator/);
  assert.doesNotMatch(opportunitiesSummaryApi, /requirePlatformAuth\(/);
  assert.doesNotMatch(opportunitiesSummaryApi, /canAccessCommandCentre/);
});

test("operator-services exposes branded Growth Engine aggregate wrappers", () => {
  assert.match(
    operatorServices,
    /export async function getOperatorGrowthFollowUpQueue\(/,
  );
  assert.match(
    operatorServices,
    /export async function getOperatorGrowthConversionSnapshot\(/,
  );
  // Wrappers must enforce the branded capability before reading.
  const followWrapper = operatorServices.slice(
    operatorServices.indexOf("getOperatorGrowthFollowUpQueue"),
  );
  assert.match(followWrapper.slice(0, 400), /requireOperator\(operator\)/);
});
