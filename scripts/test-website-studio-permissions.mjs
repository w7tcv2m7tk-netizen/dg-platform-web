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
    ["src/app/api/v1/websites/[id]/pagespeed/route.ts", ["view"]],
    ["src/app/api/v1/websites/[id]/default-footer/route.ts", ["view"]],
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
