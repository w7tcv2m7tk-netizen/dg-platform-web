import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { canAccessWebsiteStudio } from "../src/lib/website-studio-access.ts";
import { featureIdToPermissionCheck } from "../packages/platform-core/src/access/evaluate.ts";
import { sessionHasFeature } from "../packages/platform-core/src/features/access.ts";

const pages = [
  ["src/app/(shell)/apps/websites/page.tsx", /listWebsites\(/],
  ["src/app/(shell)/apps/websites/studio/[id]/page.tsx", /getWebsite\(/],
  ["src/app/(shell)/apps/websites/health/page.tsx", /listWebsitesWithPages\(/],
  ["src/app/(shell)/apps/websites/content/page.tsx", /listWebsitesWithPages\(/],
  ["src/app/(shell)/apps/websites/images/page.tsx", /listStudioLibraryImages\(/],
  ["src/app/(shell)/apps/websites/funnels/page.tsx", /listFunnelBuilderItems\(/],
  ["src/app/(shell)/apps/websites/logo/page.tsx", /getOrganisationBusinessProfile\(/],
];

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
    permissionGrants: [],
  };
}

test("websites.read maps to organisation-scope website view", () => {
  assert.deepEqual(featureIdToPermissionCheck("websites.read"), {
    module: "websites",
    action: "view",
    scope: "organisation",
    subModule: undefined,
  });
});

test("ordinary members fail websites.read and Website Studio view", () => {
  const session = {
    ...memberSession(),
    email: "member@example.com",
    organisationName: "Test Org",
  };
  assert.equal(sessionHasFeature(session, "websites.read"), false);
  assert.equal(canAccessWebsiteStudio(memberSession(), "view"), false);
  assert.equal(canAccessWebsiteStudio(memberSession(), "create"), false);
});

test("Website Studio pages require websites.read before loading tenant data", () => {
  for (const [file, loadRe] of pages) {
    const source = fs.readFileSync(file, "utf8");
    const body = pageBody(source);
    assert.match(
      body,
      /getAuthorisedPlatformPageSession\("websites\.read"\)/,
      `${file} must require websites.read`,
    );
    const authAt = body.indexOf('getAuthorisedPlatformPageSession("websites.read")');
    const loadAt = body.search(loadRe);
    assert.ok(loadAt >= 0, `${file} must load website/studio data`);
    assert.ok(
      authAt < loadAt,
      `${file} must resolve websites.read before loading tenant data`,
    );
    assert.doesNotMatch(
      source,
      /resolveActivePlatformSession/,
      `${file} must not treat a signed-in session as Studio authorisation`,
    );
    assert.doesNotMatch(
      source,
      /fetchPortalMe/,
      `${file} must not resolve Studio authority through WordPress`,
    );
  }
});

test("Health Centre does not list domains without Design Studio entitlement", () => {
  const source = fs.readFileSync(
    "src/app/(shell)/apps/websites/health/page.tsx",
    "utf8",
  );
  assert.match(
    source,
    /session && allowed\s*\n\s*\? await listOrganisationDomains/,
  );
  assert.doesNotMatch(
    source,
    /const domains = session\s*\n\s*\? await listOrganisationDomains/,
  );
});

test("website create UI requires organisation-scope website create", () => {
  const source = fs.readFileSync(
    "src/app/(shell)/apps/websites/page.tsx",
    "utf8",
  );
  assert.match(source, /canAccessWebsiteStudio\(session, "create"\)/);
  assert.match(source, /canCreate \? \(/);
});
