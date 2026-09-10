import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const pages = [
  "src/app/(shell)/apps/infrastructure/domains/page.tsx",
  "src/app/(shell)/apps/infrastructure/hosting/page.tsx",
  "src/app/(shell)/apps/infrastructure/ssl/page.tsx",
  "src/app/(shell)/apps/infrastructure/backup/page.tsx",
  "src/app/(shell)/apps/infrastructure/email/page.tsx",
  "src/app/(shell)/apps/infrastructure/cloudflare/page.tsx",
  "src/app/(shell)/apps/infrastructure/dns/page.tsx",
];

const readApis = [
  "src/app/api/v1/infrastructure/domains/route.ts",
  "src/app/api/v1/infrastructure/domains/availability/route.ts",
  "src/app/api/v1/infrastructure/domains/[id]/dns/route.ts",
  "src/app/api/v1/infrastructure/go-live/route.ts",
  "src/app/api/v1/infrastructure/email/route.ts",
  "src/app/api/v1/infrastructure/customer/route.ts",
  "src/app/api/v1/infrastructure/cloudflare/route.ts",
];

const writeApis = [
  "src/app/api/v1/infrastructure/domains/route.ts",
  "src/app/api/v1/infrastructure/domains/[id]/dns/route.ts",
  "src/app/api/v1/infrastructure/go-live/route.ts",
  "src/app/api/v1/infrastructure/email/route.ts",
  "src/app/api/v1/infrastructure/customer/route.ts",
  "src/app/api/v1/infrastructure/cloudflare/route.ts",
];

test("infrastructure pages require infrastructure.read before tenant or platform data", () => {
  for (const file of pages) {
    const source = fs.readFileSync(file, "utf8");
    const body = source.slice(source.indexOf("export default"));
    assert.match(
      body,
      /getAuthorisedPlatformPageSession\("infrastructure\.read"\)/,
      `${file} must require infrastructure.read`,
    );
    assert.doesNotMatch(
      source,
      /resolveActivePlatformSession|fetchPortalMe/,
      `${file} must not treat a signed-in session / WP portal as infra authorisation`,
    );
  }
});

test("infrastructure GET APIs require infrastructure.read before data access", () => {
  for (const file of readApis) {
    const source = fs.readFileSync(file, "utf8");
    const getAt = source.indexOf("export async function GET");
    assert.ok(getAt >= 0, `${file} must export GET`);
    const get = source.slice(getAt);
    const authAt = get.indexOf('requireFeature(session, "infrastructure.read")');
    assert.ok(authAt >= 0, `${file} GET must require infrastructure.read`);
    const loadAt = get.search(
      /listOrganisationDomains\(|getOrganisationDomain\(|buildGoLiveChecklist\(|getEmailInfrastructureOverview\(|getPersistedDreamscapeCustomerLink\(|getCloudflareInfrastructureOverview\(|getInfrastructureBackupOverview\(|exportOrganisationWebsiteBackup\(/,
    );
    if (loadAt >= 0) {
      assert.ok(authAt < loadAt, `${file} GET must authorise before loading data`);
    }
  }
});

test("infrastructure mutations require infrastructure.write", () => {
  for (const file of writeApis) {
    const source = fs.readFileSync(file, "utf8");
    const postAt = source.indexOf("export async function POST");
    assert.ok(postAt >= 0, `${file} must export POST`);
    const post = source.slice(postAt);
    assert.match(
      post,
      /requireFeature\(session, "infrastructure\.write"\)/,
      `${file} POST must require infrastructure.write`,
    );
  }

  const backup = fs.readFileSync(
    "src/app/api/v1/infrastructure/backup/route.ts",
    "utf8",
  );
  assert.match(
    backup,
    /download \? "infrastructure\.write" : "infrastructure\.read"/,
    "backup download must require write authority",
  );
});

test("members have no default infrastructure grants", () => {
  const defaults = fs.readFileSync(
    "packages/platform-core/src/access/defaults.ts",
    "utf8",
  );
  const memberBlock = defaults.slice(
    defaults.indexOf("// Member"),
    defaults.indexOf("export function defaultGrantsForPlatformUserType"),
  );
  assert.doesNotMatch(memberBlock, /"infrastructure"/);
  assert.match(defaults, /OPERATIONAL_MODULES[\s\S]*"infrastructure"/);
});
