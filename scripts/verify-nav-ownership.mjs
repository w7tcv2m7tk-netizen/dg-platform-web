/**
 * Assert nav chrome ownership (self-contained — no package import graph).
 * Usage: node scripts/verify-nav-ownership.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const platformTools = readFileSync(
  join(root, "packages/platform-core/src/apps/platform-tools.ts"),
  "utf8",
);
const activeNav = readFileSync(
  join(root, "packages/platform-core/src/apps/active-nav.ts"),
  "utf8",
);
const navigation = readFileSync(
  join(root, "packages/platform-core/src/apps/navigation.ts"),
  "utf8",
);

let failed = 0;

function assert(ok, msg) {
  if (ok) console.log(`OK   ${msg}`);
  else {
    failed += 1;
    console.error(`FAIL ${msg}`);
  }
}

assert(
  !/path:\s*"\/dashboard\/settings\/organisation"/.test(platformTools),
  "Settings routes do not include /dashboard/settings/organisation",
);
assert(
  !/label:\s*"Organisation"/.test(platformTools),
  "Settings routes do not label a tab Organisation",
);
assert(
  !/matchAlso:\s*\[[^\]]*\/dashboard\/business/.test(platformTools),
  "Settings does not matchAlso /dashboard/business",
);
assert(
  /path:\s*"\/dashboard\/business",\s*label:\s*"Business Profile"/.test(navigation),
  "Business nav owns Business Profile at /dashboard/business",
);
assert(
  /path:\s*"\/dashboard\/team",\s*label:\s*"Team"/.test(navigation),
  "Business nav owns Team at /dashboard/team",
);
assert(
  /1_000_000\s*\+\s*bestPrimary/.test(activeNav),
  "matchSpecificity prefers primary path ownership over matchAlso",
);
assert(
  /bestAlias/.test(activeNav) && /matched alias length|alias length/.test(activeNav),
  "matchSpecificity scores alias length separately from declared path",
);

const orgPage = readFileSync(
  join(root, "src/app/(shell)/dashboard/settings/organisation/page.tsx"),
  "utf8",
);
assert(
  /redirect\(\s*"\/dashboard\/business"\s*\)/.test(orgPage),
  "legacy Settings Organisation redirects to Business Profile",
);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nOK — nav ownership assertions passed");
