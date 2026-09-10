import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { featureIdToPermissionCheck } from "../packages/platform-core/src/access/evaluate.ts";
import { sessionHasFeature } from "../packages/platform-core/src/features/access.ts";
import { canAccessWebsiteStudio } from "../src/lib/website-studio-access.ts";

const evaluate = fs.readFileSync(
  "packages/platform-core/src/access/evaluate.ts",
  "utf8",
);
const seoIndex = fs.readFileSync("packages/platform-core/src/seo/index.ts", "utf8");
const fixApi = fs.readFileSync("src/app/api/v1/seo/fix/route.ts", "utf8");
const auditApi = fs.readFileSync("src/app/api/v1/seo/audit/route.ts", "utf8");
const marketingAction = fs.readFileSync(
  "src/app/(shell)/apps/marketing/audits/actions.ts",
  "utf8",
);

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

test("seo.read and seo.write map to growth before they are used as guards", () => {
  assert.match(evaluate, /seo:\s*"growth"/);
  assert.deepEqual(featureIdToPermissionCheck("seo.read"), {
    module: "growth",
    action: "view",
    scope: "organisation",
    subModule: undefined,
  });
  assert.deepEqual(featureIdToPermissionCheck("seo.write"), {
    module: "growth",
    action: "create",
    scope: "assigned",
    subModule: undefined,
  });
});

test("Members pass mapped SEO growth checks but fail organisation-scope Studio edit", () => {
  const session = memberSession();
  assert.equal(sessionHasFeature(session, "seo.read"), true);
  assert.equal(sessionHasFeature(session, "seo.write"), true);
  assert.equal(canAccessWebsiteStudio(session, "view"), false);
  assert.equal(canAccessWebsiteStudio(session, "edit"), false);
});

test("SEO fix refuses to mutate Studio pages without websites.edit at organisation scope", () => {
  const handler = fixApi.slice(fixApi.indexOf("export async function POST"));
  assert.match(handler, /requireFeature\(session, "seo\.write"\)/);
  assert.match(handler, /canAccessWebsiteStudio\(session, "edit"\)/);
  assert.ok(
    handler.indexOf('requireFeature(session, "seo.write")') <
      handler.indexOf("fixOrgSeoFromAudit("),
    "seo.write must be required before writing Studio SEO",
  );
  assert.ok(
    handler.indexOf('canAccessWebsiteStudio(session, "edit")') <
      handler.indexOf("fixOrgSeoFromAudit("),
    "Studio edit must be required before writing Studio SEO",
  );
});

test("SEO audit does not load Studio pages unless the caller has Studio view", () => {
  assert.match(seoIndex, /includeNativeStudio\?: boolean/);
  assert.match(seoIndex, /if \(input\.includeNativeStudio\)/);
  assert.ok(
    seoIndex.indexOf("if (input.includeNativeStudio)") <
      seoIndex.indexOf("listWebsitesWithPages("),
    "native Studio reads must be opt-in",
  );

  const post = auditApi.slice(auditApi.indexOf("export async function POST"));
  assert.match(post, /requireFeature\(session, "seo\.read"\)/);
  assert.match(
    post,
    /includeNativeStudio:\s*canAccessWebsiteStudio\(session, "view"\)/,
  );
  assert.ok(
    post.indexOf('requireFeature(session, "seo.read")') <
      post.indexOf("runOrgSeoAudit("),
  );

  const get = auditApi.slice(auditApi.indexOf("export async function GET"));
  assert.match(get, /requireFeature\(session, "seo\.read"\)/);
  assert.ok(
    get.indexOf('requireFeature(session, "seo.read")') <
      get.indexOf("listOrgSeoAudits("),
  );
});

test("marketing SEO audit action uses mapped seo.read and does not default-load Studio", () => {
  assert.match(marketingAction, /sessionHasFeature\(session, "seo\.read"\)/);
  assert.match(
    marketingAction,
    /includeNativeStudio:\s*canAccessWebsiteStudio\(session, "view"\)/,
  );
  assert.ok(
    marketingAction.indexOf('sessionHasFeature(session, "seo.read")') <
      marketingAction.indexOf("runOrgSeoAudit("),
  );
});
