import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { featureIdToPermissionCheck } from "../packages/platform-core/src/access/evaluate.ts";
import { sessionHasFeature } from "../packages/platform-core/src/features/access.ts";

const evaluate = fs.readFileSync(
  "packages/platform-core/src/access/evaluate.ts",
  "utf8",
);
const page = fs.readFileSync(
  "src/app/(shell)/apps/opportunities/page.tsx",
  "utf8",
);
const crmPage = fs.readFileSync(
  "src/app/(shell)/apps/crm/opportunities/page.tsx",
  "utf8",
);

function pageBody(source) {
  const start = source.indexOf("export default async function");
  assert.ok(start >= 0, "page must export a default async function");
  return source.slice(start);
}

function memberSession() {
  return {
    role: "member",
    organisationId: "org_test",
    clerkUserId: "user_member",
    email: "member@example.com",
    organisationName: "Test Org",
    permissionGrants: [],
  };
}

test("opportunities.* maps to intelligence, not CRM, before it is used as a guard", () => {
  assert.match(evaluate, /opportunities:\s*"intelligence"/);
  assert.deepEqual(featureIdToPermissionCheck("opportunities.view"), {
    module: "intelligence",
    action: "view",
    scope: "organisation",
    subModule: undefined,
  });
  assert.deepEqual(featureIdToPermissionCheck("opportunities.list.read"), {
    module: "intelligence",
    action: "view",
    scope: "organisation",
    subModule: "list",
  });
  assert.deepEqual(featureIdToPermissionCheck("crm.opportunities.read"), {
    module: "crm",
    action: "view",
    scope: "organisation",
    subModule: "opportunities",
  });
});

test("unmapped commercial and pm read IDs are not used as page guards", () => {
  assert.equal(featureIdToPermissionCheck("commercial.properties.read"), null);
  assert.equal(featureIdToPermissionCheck("pm.properties.read"), null);
  assert.equal(featureIdToPermissionCheck("property-management.leases.read"), null);
});

test("Members keep intelligence org view after the opportunities mapping", () => {
  const session = memberSession();
  assert.equal(sessionHasFeature(session, "opportunities.view"), true);
  assert.equal(sessionHasFeature(session, "command.read"), true);
  assert.equal(sessionHasFeature(session, "crm.opportunities.read"), true);
});

test("tenant Opportunities app requires the mapped intelligence feature before listing", () => {
  const body = pageBody(page);
  assert.match(
    body,
    /getAuthorisedPlatformPageSession\("opportunities\.view"\)/,
  );
  const authAt = body.indexOf(
    'getAuthorisedPlatformPageSession("opportunities.view")',
  );
  const loadAt = body.indexOf("listPlatformOpportunities(");
  assert.ok(loadAt >= 0);
  assert.ok(authAt < loadAt);
  assert.doesNotMatch(page, /resolveActivePlatformSession/);
});

test("CRM opportunities stay on the existing crm.opportunities.read mapping", () => {
  assert.match(
    crmPage,
    /getAuthorisedPlatformPageSession\("crm\.opportunities\.read"\)/,
  );
  assert.doesNotMatch(
    crmPage,
    /getAuthorisedPlatformPageSession\("opportunities\.view"\)/,
  );
});
