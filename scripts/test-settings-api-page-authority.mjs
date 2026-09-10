import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const page = fs.readFileSync(
  "src/app/(shell)/dashboard/settings/api/page.tsx",
  "utf8",
);
const api = fs.readFileSync("src/lib/platform-api.ts", "utf8");
const keysRoute = fs.readFileSync(
  "src/app/api/v1/platform/api-keys/route.ts",
  "utf8",
);

test("settings API page requires the same org-admin authority as key APIs", () => {
  const body = page.slice(page.indexOf("export default async function"));
  assert.match(body, /getPlatformPageContext\(/);
  assert.match(body, /sessionIsOrgAdmin\(session\)/);
  assert.ok(
    body.indexOf("sessionIsOrgAdmin(session)") < body.indexOf("getPlatformApiCatalog("),
    "catalog must not render before the org-admin check",
  );
  assert.ok(
    body.indexOf("sessionIsOrgAdmin(session)") < body.indexOf("PlatformApiKeysPanel"),
    "key management UI must not render before the org-admin check",
  );
  assert.doesNotMatch(page, /fetchPortalMe/);
  assert.doesNotMatch(page, /resolveActivePlatformSession/);
});

test("sessionIsOrgAdmin matches requireOrgAdmin predicates", () => {
  assert.match(api, /export function sessionIsOrgAdmin/);
  assert.match(
    api,
    /session\.clerkUserId\.startsWith\("api_key:"\)\) return false/,
  );
  assert.match(api, /\["owner", "admin"\]\.includes\(session\.role\)\) return true/);
  assert.match(
    api,
    /module:\s*"team",\s*action:\s*"manage",\s*scope:\s*"organisation"/,
  );
  assert.match(keysRoute, /requireOrgAdmin\(session\)/);
});
