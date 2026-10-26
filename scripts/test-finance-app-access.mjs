import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  financeAppAccessDenial,
  financeAppAccessStateOrDenied,
  resolveFinanceAppAccessState,
} from "../src/lib/finance-app-access-policy.ts";
import { organisationHasSelectedIndustryApp } from "../src/lib/industry-app-selection.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const api = read("src/app/api/v1/finance/applications/route.ts");
const access = read("src/lib/finance-app-access.ts");
const policy = read("src/lib/finance-app-access-policy.ts");
const layout = read("src/app/(shell)/apps/finance/layout.tsx");
const shellLoader = read("src/components/PlatformShellLoader.tsx");
const shell = read("src/components/PlatformShell.tsx");
const provider = read("src/components/platform/EnabledAppsProvider.tsx");
const nav = read("packages/platform-core/src/apps/navigation.ts");
const appSelection = read("src/app/api/v1/org/apps/route.ts");
const templateSelection = read("src/app/api/v1/org/industry/templates/route.ts");
const scaffold = read("src/lib/business-app-scaffolds.ts");
const publicSync = read("scripts/sync-digitalgate-apps-pages.mjs");
const lendConnector = read("src/app/api/v1/connectors/lend/route.ts");
const specialistEntitlement = read("src/lib/specialist-industry-entitlement.ts");

function verifiedFinanceAuthority(overrides = {}) {
  return {
    organisationId: "org-a",
    featureFlags: { "finance.beta": true },
    organisationSettings: { apps: { planPreview: { industryApps: ["finance"] } } },
    canonicalSubscription: {
      organisationId: "org-a",
      stripeSubscriptionId: "sub-a",
      stripeCustomerId: "cus-a",
      stripeStatus: "trialing",
      entitlement: "FULL",
      status: "TRIALING",
      industryApps: ["finance"],
      premiumApps: [],
      trialEnd: new Date("2026-11-01T00:00:00.000Z"),
      currentPeriodEnd: new Date("2026-11-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
    },
    stripeSubscription: null,
    ...overrides,
  };
}

test("canonical verified trial projection authorizes Finance only for its tenant", () => {
  const valid = resolveFinanceAppAccessState(verifiedFinanceAuthority());
  assert.deepEqual(valid, { industryEntitled: true, betaEnrolled: true, selectedForOrganisation: true });
  assert.equal(financeAppAccessDenial(valid), null);
  assert.equal(resolveFinanceAppAccessState(verifiedFinanceAuthority({ organisationId: "org-b" })).industryEntitled, false);
  const forgedSettings = { profile: { purchasedApps: ["finance"] } };
  const noAuthority = resolveFinanceAppAccessState(verifiedFinanceAuthority({ canonicalSubscription: null }));
  assert.equal(noAuthority.industryEntitled, false);
  assert.deepEqual(forgedSettings.profile.purchasedApps, ["finance"]);
  assert.equal(financeAppAccessDenial(noAuthority), "industry_app_purchase_required");
  assert.equal(financeAppAccessDenial(resolveFinanceAppAccessState(verifiedFinanceAuthority({ featureFlags: {} }))), "beta_required");
});

test("expired, cancelled, mismatched and legacy-empty authority fails closed", () => {
  const cases = [
    { stripeStatus: "canceled", status: "CANCELLED" },
    { entitlement: "NONE" },
    { industryApps: [] },
    { trialEnd: new Date("2026-10-17T00:00:00.000Z") },
    { organisationId: "org-b" },
  ];
  for (const override of cases) {
    const state = resolveFinanceAppAccessState(verifiedFinanceAuthority({ canonicalSubscription: {
      ...verifiedFinanceAuthority().canonicalSubscription, ...override,
    } }));
    assert.equal(state.industryEntitled, false);
  }
});

test("an authority lookup failure cannot authorize direct access", async () => {
  const state = await financeAppAccessStateOrDenied(async () => {
    throw new Error("database unavailable");
  });
  assert.deepEqual(state, { industryEntitled: false, betaEnrolled: false, selectedForOrganisation: false });
  assert.equal(financeAppAccessDenial(state), "beta_required");
});

test("Finance access requires both paid Industry entitlement and beta enrolment", () => {
  assert.equal(
    financeAppAccessDenial({ industryEntitled: false, betaEnrolled: false }),
    "beta_required",
  );
  assert.equal(
    financeAppAccessDenial({ industryEntitled: true, betaEnrolled: false }),
    "beta_required",
  );
  assert.equal(
    financeAppAccessDenial({ industryEntitled: false, betaEnrolled: true }),
    "industry_app_purchase_required",
  );
  assert.equal(
    financeAppAccessDenial({ industryEntitled: true, betaEnrolled: true, selectedForOrganisation: true }),
    null,
  );
  assert.equal(financeAppAccessDenial({ industryEntitled: true, betaEnrolled: true, selectedForOrganisation: false }), "industry_app_not_selected");
  assert.match(access, /prisma\.platformSubscription\.findUnique/);
  assert.doesNotMatch(access, /stripe\.subscriptions\.retrieve/);
  assert.match(access, /featureFlags: settings\.featureFlags/);
  assert.doesNotMatch(access, /profile\.purchasedApps/);
  assert.match(policy, /featureFlags\?\.\["finance\.beta"\] === true/);
});

test("Finance page and every direct applications API method enforce access", () => {
  for (const method of ["GET", "POST", "PATCH"]) {
    const start = api.indexOf(`export async function ${method}`);
    const next = api.indexOf("export async function ", start + 1);
    const body = api.slice(start, next === -1 ? undefined : next);
    assert.ok(start >= 0, `${method} handler exists`);
    assert.match(body, /requirePlatformAuth/);
    assert.match(body, /requireFinanceAppAccess\(session\.organisationId\)/);
    const operation = {
      GET: "listFinanceApplications(",
      POST: "createFinanceApplication(",
      PATCH: "updateFinanceApplication(",
    }[method];
    assert.ok(
      body.indexOf("requireFinanceAppAccess(session.organisationId)") < body.indexOf(operation),
      `${method} checks access before reaching application data operations`,
    );
  }
  assert.match(layout, /getFinanceAppAccessState/);
  assert.match(layout, /IndustryBetaAppLayout appId="finance"/);
  assert.match(layout, /catch \{/);
  assert.match(shellLoader, /financeAccess\.industryEntitled && financeAccess\.betaEnrolled && financeAccess\.selectedForOrganisation/);
  assert.match(access, /financeAppAccessStateOrDenied\(/);
});

test("page/API selection policy ignores editable purchase claims and honours canonical deactivation", () => {
  assert.equal(organisationHasSelectedIndustryApp({ profile: { purchasedApps: ["finance"] } }, "finance"), false);
  assert.equal(organisationHasSelectedIndustryApp({ industry: { templates: { finance: { active: false } } }, apps: { planPreview: { industryApps: ["finance"] } } }, "finance"), false);
  assert.equal(organisationHasSelectedIndustryApp({ industry: { templates: { finance: { active: true } } } }, "finance"), true);
  assert.equal(organisationHasSelectedIndustryApp({ apps: { planPreview: { industryApps: ["finance"] } } }, "finance"), true);
  assert.match(read("src/lib/platform-api.ts"), /organisationHasSelectedIndustryApp\(organisation\?\.settings/);
});

test("every identified subscription entitlement query selects the grace-period deadline", () => {
  for (const path of [
    "src/app/api/v1/org/apps/route.ts",
    "src/app/api/v1/org/industry/templates/route.ts",
    "src/lib/finance-app-access.ts",
    "src/lib/specialist-industry-entitlement.ts",
    "src/components/PlatformShellLoader.tsx",
  ]) assert.match(read(path), /gracePeriodEndsAt:\s*true/, path);
});

test("supported Finance activation paths enrol beta only through app selection", () => {
  assert.match(appSelection, /enrolIndustryBetasForEnabled/);
  assert.match(appSelection, /const featureFlags = enrolIndustryBetasForEnabled\(settings\.featureFlags, enabled\)/);
  assert.match(appSelection, /const unpaidIndustry = unpaidIndustryApps\(requested, canonicalIndustryApps, staffOrOperator\)/);
  assert.match(templateSelection, /enrolIndustryBetasForAppIds/);
  assert.match(templateSelection, /action === "activate" && template\.appId/);
  assert.match(templateSelection, /industry_app_purchase_required/);
});

test("Finance is hidden from navigation unless both gates pass", () => {
  assert.match(shell, /financeAccessEnabled/);
  assert.match(provider, /financeAccessEnabled \? \[\] : \["finance"\]/);
  assert.match(nav, /hiddenAppIds\?: string\[\]/);
  assert.match(nav, /hiddenAppIds\.has\(template\.appId\)/);
  assert.match(nav, /!hiddenAppIds\.has\(a\.manifest\.id\)/);
});

test("Finance editing remains permission-gated and documentation describes the manual floor", () => {
  const writes = api.slice(api.indexOf("export async function POST"));
  assert.match(writes, /requirePermission/);
  assert.match(writes, /scope: "organisation"/);
  assert.match(writes, /subModule: "finance"/);
  assert.match(scaffold, /CRM-linked borrowers/);
  assert.match(scaffold, /Automated lender submission or status sync/);
  assert.ok(publicSync.includes("Finance — Coming Soon"));
  assert.ok(publicSync.includes("Finance — Early Access"));
  assert.match(publicSync, /for \(const \[re, rep\] of chipReplacements\) out = out\.replace\(re, rep\)/);
});

test("Finance specialist integrations reuse verified purchase authority", () => {
  assert.match(specialistEntitlement, /requiredIndustryId === "finance"/);
  assert.match(specialistEntitlement, /requireFinanceAppAccess\(organisationId\)/);
  assert.match(specialistEntitlement, /requiredIndustryId === "finance"/);
  assert.match(lendConnector, /specialistIndustryEntitlementBlock\(session\.organisationId, "finance"\)/);
  assert.match(lendConnector, /async function authorise/);
  assert.match(lendConnector, /authorise\(req\)/);
  const getStart = lendConnector.indexOf("export async function GET");
  const getEnd = lendConnector.indexOf("export async function POST", getStart);
  assert.match(lendConnector.slice(getStart, getEnd), /specialistIndustryEntitlementBlock\(session\.organisationId, "finance"\)/);
});

test("Finance mutations respect the canonical tenant write entitlement", () => {
  for (const method of ["POST", "PATCH"]) {
    const start = api.indexOf(`export async function ${method}`);
    const next = api.indexOf("export async function ", start + 1);
    const body = api.slice(start, next === -1 ? undefined : next);
    assert.match(body, /tenantWriteEntitlementBlock\(session\)/);
    assert.match(body, /writeEntitlementResponse\(writeBlock\)/);
  }
});
