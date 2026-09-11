import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { canAccessWebsiteStudio } from "../src/lib/website-studio-access.ts";

function session(role, permissionGrants = [], clerkUserId = "user_test") {
  return {
    role,
    organisationId: "org_test",
    clerkUserId,
    permissionGrants,
  };
}

test("organisation owners and admins can operate Website Studio at organisation scope", () => {
  for (const role of ["owner", "admin"]) {
    assert.equal(canAccessWebsiteStudio(session(role), "view"), true);
    assert.equal(canAccessWebsiteStudio(session(role), "create"), true);
    assert.equal(canAccessWebsiteStudio(session(role), "edit"), true);
    assert.equal(canAccessWebsiteStudio(session(role), "delete"), true);
  }
});

test("ordinary members cannot use assigned-scope website grants as organisation-wide Studio authority", () => {
  assert.equal(canAccessWebsiteStudio(session("member"), "view"), false);
  assert.equal(canAccessWebsiteStudio(session("member"), "create"), false);
  assert.equal(canAccessWebsiteStudio(session("member"), "edit"), false);
  assert.equal(canAccessWebsiteStudio(session("member"), "delete"), false);
});

test("an explicit organisation-scope website grant can authorise the matching member action", () => {
  const member = session("member", [
    { module: "websites", action: "edit", scope: "organisation" },
  ]);
  assert.equal(canAccessWebsiteStudio(member, "edit"), true);
  assert.equal(canAccessWebsiteStudio(member, "delete"), false);
});

test("DigitalGate staff retains server-resolved platform website authority", () => {
  assert.equal(canAccessWebsiteStudio(session("dg:staff"), "view"), true);
  assert.equal(canAccessWebsiteStudio(session("dg:staff"), "edit"), true);
});

test("Studio API and preview entry points are wired through the access guard", async () => {
  const checks = [
    ["src/app/api/v1/websites/route.ts", ["view", "create"]],
    ["src/app/api/v1/websites/[id]/route.ts", ["view", "edit", "delete"]],
    ["src/app/api/v1/websites/[id]/pages/route.ts", ["create", "edit"]],
    ["src/app/api/v1/websites/[id]/pages/[pageId]/route.ts", ["edit", "delete"]],
    ["src/app/api/v1/websites/[id]/chrome/route.ts", ["edit"]],
    ["src/app/api/v1/websites/[id]/import-wordpress/route.ts", ["edit"]],
    ["src/app/api/v1/websites/[id]/assist/route.ts", ["edit"]],
    ["src/app/api/v1/websites/[id]/seo-suggest/route.ts", ["view"]],
    ["src/app/api/v1/websites/[id]/ai-markup/route.ts", ["view"]],
    ["src/app/api/v1/websites/[id]/ai-component/route.ts", ["view"]],
    ["src/app/api/v1/websites/[id]/pagespeed/route.ts", ["edit"]],
    ["src/app/api/v1/websites/[id]/default-footer/route.ts", ["view"]],
    ["src/app/api/v1/websites/images/route.ts", ["view", "edit"]],
    ["src/app/api/v1/websites/images/[id]/route.ts", ["delete"]],
    ["src/lib/website-studio-preview.ts", ["view"]],
  ];

  for (const [path, actions] of checks) {
    const source = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.match(source, /canAccessWebsiteStudio/);
    for (const action of actions) {
      assert.match(source, new RegExp(`canAccessWebsiteStudio\\(session, ["']${action}["']\\)`));
    }
  }
});

test("Website Health keeps mutation controls off read-only sessions", async () => {
  const source = await readFile(
    new URL("../src/app/(shell)/apps/websites/health/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /canAccessWebsiteStudio\(session, ["']edit["']\)/);
  assert.match(source, /canEdit \? <PageSpeedRefreshButton/);
  assert.match(source, /const action = canEdit \? healthActionHref/);
});

test("legacy migration health does not expose connector plumbing to customers", async () => {
  const source = await readFile(
    new URL("../src/components/websites/HealthCentreDashboard.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /connectorBaseUrl/);
  assert.doesNotMatch(source, /roerealty\.com\.au/);
  assert.doesNotMatch(source, /GET \/site\/health/);
  assert.doesNotMatch(source, /DG Platform plugin/);
  assert.doesNotMatch(source, /<dt[^>]*>Code:/);
  assert.match(source, /Check the migration connection and try again/);
});

test("Studio mutation APIs keep implementation details out of customer feedback", async () => {
  const paths = [
    "src/app/api/v1/websites/[id]/route.ts",
    "src/app/api/v1/websites/[id]/assist/route.ts",
    "src/app/api/v1/websites/[id]/pages/route.ts",
    "src/app/api/v1/websites/[id]/pages/[pageId]/route.ts",
  ];
  const sources = await Promise.all(
    paths.map((path) => readFile(new URL(`../${path}`, import.meta.url), "utf8")),
  );
  const combined = sources.join("\n");
  assert.doesNotMatch(combined, /Insufficient permissions for websites\./);
  assert.doesNotMatch(combined, /Website Builder disabled/);
  assert.doesNotMatch(combined, /pageId required/);
  assert.doesNotMatch(combined, /pageIds required/);
  assert.doesNotMatch(combined, /message:\s*err instanceof Error/);
  assert.match(sources[0], /generator: \{ source: ["']Aida["'] \}/);
  assert.match(sources[1], /source: ["']Aida["']/);
});

test("Design Studio home and create flow stay permission-truthful", async () => {
  const home = await readFile(
    new URL("../src/app/(shell)/apps/websites/page.tsx", import.meta.url),
    "utf8",
  );
  const create = await readFile(
    new URL("../src/components/websites/CreateWebsiteForm.tsx", import.meta.url),
    "utf8",
  );
  assert.match(home, /canAccessWebsiteStudio\(session, ["']edit["']\)/);
  assert.match(home, /sessionCan\(session, \{[\s\S]*?module: ["']settings["'][\s\S]*?action: ["']edit["'][\s\S]*?scope: ["']organisation["'][\s\S]*?\}\)/);
  assert.match(home, /\{canEdit \? ["']Studio["'] : ["']View["']\}/);
  assert.match(home, /\{canEdit \? \(/);
  assert.match(home, /canEditBrand=\{canEditBrand\}/);
  assert.doesNotMatch(create, /AI generation is not shipped/);
  assert.doesNotMatch(create, /Created but missing id/);
  assert.doesNotMatch(create, /Network error/);
  assert.doesNotMatch(create, /Marketplace \(Wantd\)/);
  assert.match(create, /canEditBrand/);
  assert.match(create, /current brand\. Brand changes require Settings edit access/);
});

test("Content overview keeps create and edit actions off read-only sessions", async () => {
  const source = await readFile(
    new URL("../src/app/(shell)/apps/websites/content/page.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /canAccessWebsiteStudio\(session, ["']create["']\)/);
  assert.match(source, /canAccessWebsiteStudio\(session, ["']edit["']\)/);
  assert.match(source, /\{canCreate \? \(/);
  assert.match(source, /\{canEdit \? ["']Open Studio["'] : ["']View website["']\}/);
  assert.match(source, /\{canEdit \? ["']Edit page →["'] : ["']View page →["']\}/);
  assert.match(source, /\{canEdit \? \([\s\S]*?SEO →/);
});
